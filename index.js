#!/usr/bin/env node
const bluebird = require('bluebird');
const execa = require('execa');
const ora = require('ora');
const inquirer = require('inquirer');
const inquirerAutocompletePrompt = require('inquirer-autocomplete-prompt');
const chalk = require('chalk').default;

const blankChars = ' \t\n\r\f\v';
const regExpChars = '\\^$.*+?()[]{}|';
const args = process.argv.slice(2);

inquirer.registerPrompt('autocomplete', inquirerAutocompletePrompt);

const match = (text, input) => {
  const inputChars = Array.from(input).filter(
    input => blankChars.indexOf(input) === -1
  );
  const pattern = inputChars
    .map(char => (regExpChars.indexOf(char) !== -1 ? `\\${char}` : char))
    .join('.*');
  return new RegExp(pattern).test(text);
};

const ask = (message, choices) =>
  inquirer
    .prompt([
      {
        type: 'autocomplete',
        message,
        source: async (answers, input) =>
          choices.filter(choice => match(choice, input || '')),
        when: answers => {
          const input = args.shift();
          if (!input) {
            return true;
          }
          const found = choices.find(choice => match(choice, input));
          if (!found) {
            return true;
          }
          answers.input = found;
          ora(`${chalk.bold(message)} ${chalk.cyan(found)}`).info();
        },
        name: 'input',
      },
    ])
    .then(res => res.input);

const askMultiple = (message, choices) =>
  inquirer
    .prompt([
      {
        type: 'autocomplete',
        message,
        suggestOnly: true,
        source: async (answers, input) =>
          choices.filter(choice => match(choice, input || '')),
        when: answers => {
          const input = args.shift();
          if (!input) {
            return true;
          }
          const found = choices.find(choice => match(choice, input));
          if (!found) {
            return true;
          }
          answers.input = input;
          ora(`${chalk.bold(message)} ${chalk.cyan(input)}`).info();
        },
        name: 'input',
      },
    ])
    .then(res => choices.filter(choice => match(choice, res.input || '')));

const askFilter = (message, choices) =>
  inquirer
    .prompt([
      {
        type: 'checkbox',
        message,
        choices,
        default: choices,
        name: 'input',
      },
    ])
    .then(res => res.input);

/*
 * Operations not implemented:
 * 'describe', 'create', 'update', 'delete', 'rolling-update', 'port-forward', 'proxy',
 * 'run', 'expose', 'label', 'config', 'cluster-info', 'api-versions', 'version', 'help'
 */
const ops = {
  get: 'get',
  exec: 'exec',
  logHistory: 'log (history only)',
  logFuture: 'log (future only)',
  logMultipleFuture: 'log (future only, multiple pods)',
};

const oplist = [
  ops.get,
  ops.exec,
  ops.logHistory,
  ops.logFuture,
  ops.logMultipleFuture,
];

const resourceTypes = [
  'all',
  // 'certificatesigningrequests',
  // 'clusterrolebindings',
  // 'clusterroles',
  // 'componentstatuses',
  // 'configmaps',
  // 'controllerrevisions',
  // 'cronjobs',
  // 'customresourcedefinition',
  // 'daemonsets',
  'deployments',
  'endpoints',
  'events',
  // 'horizontalpodautoscalers',
  // 'ingresses',
  'jobs',
  // 'limitranges',
  'namespaces',
  // 'networkpolicies',
  'nodes',
  // 'persistentvolumeclaims',
  // 'persistentvolumes',
  // 'poddisruptionbudgets',
  // 'podpreset',
  'pods',
  // 'podsecuritypolicies',
  // 'podtemplates',
  'replicasets',
  // 'replicationcontrollers',
  // 'resourcequotas',
  // 'rolebindings',
  // 'roles',
  // 'secrets',
  // 'serviceaccounts',
  'services',
  'statefulsets',
  'storageclasses',
];

async function selectPod(namespace) {
  const pods = await execa
    .stdout('kubectl', ['-n', namespace, 'get', 'pods'])
    .then(raw =>
      raw
        .trim()
        .split('\n')
        .map(line => line.trim().split(/\s+/)[0])
        .filter(word => word !== 'NAME')
    );
  return ask('Select a pod:', pods);
}

async function selectMultiplePod(namespace) {
  const pods = await execa
    .stdout('kubectl', ['-n', namespace, 'get', 'pods'])
    .then(raw =>
      raw
        .trim()
        .split('\n')
        .map(line => line.trim().split(/\s+/)[0])
        .filter(word => word !== 'NAME')
    );
  return askMultiple('Select a pod:', pods);
}

async function main() {
  ora(
    chalk.yellow(
      '[pre-release] This is a pre-release version, with limited functionality.'
    )
  ).warn();

  const namespaces = await execa
    .stdout('kubectl', ['get', 'namespaces'])
    .then(raw =>
      raw
        .trim()
        .split('\n')
        .map(line => line.trim().split(/\s+/)[0])
        .filter(word => word !== 'NAME')
    );

  const namespace = await ask('Select a namespace:', namespaces);
  const operation = await ask('What do you want to do?', oplist);

  switch (operation) {
    case ops.get:
      {
        const resourceType = await ask(
          'Select an resource type:',
          resourceTypes
        );

        const output = await execa.stdout('kubectl', [
          '-n',
          namespace,
          'get',
          resourceType,
        ]);
        console.log(output);
      }
      break;
    case ops.exec:
      {
        const pod = await selectPod(namespace);
        await execa('kubectl', ['-n', namespace, 'exec', '-it', pod, 'bash'], {
          stdio: 'inherit',
          reject: false,
        });
      }
      break;
    case ops.logHistory:
      {
        const pod = await selectPod(namespace);
        await execa('kubectl', ['-n', namespace, 'log', pod], {
          stdout: 'inherit',
          stderr: 'inherit',
          reject: false,
        });
      }
      break;
    case ops.logFuture:
      {
        const pod = await selectPod(namespace);
        const e = execa(
          'kubectl',
          ['-n', namespace, 'log', '-f', '--tail=1', pod],
          { reject: false }
        );
        e.stdout.pipe(process.stdout);
        e.stderr.pipe(process.stderr);
        await e;
      }
      break;
    case ops.logMultipleFuture:
      {
        const pods = await selectMultiplePod(namespace).then(match =>
          askFilter('Confirm pods you need:', match)
        );

        await bluebird.map(pods, pod => {
          const e = execa(
            'kubectl',
            ['-n', namespace, 'log', '-f', '--tail=1', pod],
            { reject: false }
          );
          e.stdout.pipe(process.stdout);
          e.stderr.pipe(process.stderr);
          return e;
        });
      }
      break;
    default:
      ora(`Operation ${chalk.cyan(operation)} is not supported yet.`).fail();
      break;
  }
}

main().catch(error => {
  ora(error.message).fail();
});
