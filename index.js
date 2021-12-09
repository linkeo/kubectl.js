#!/usr/bin/env node
const bluebird = require('bluebird');
const execa = require('execa');
const ora = require('ora');
const inquirer = require('inquirer');
const logUpdate = require('log-update');
const spinners = require('cli-spinners');
const inquirerAutocompletePrompt = require('inquirer-autocomplete-prompt');
const chalk = require('chalk').default;
const PodsWatcher = require('./plugins/pods_watcher');

const blankChars = ' \t\n\r\f\v';
const regExpChars = '\\^$.*+?()[]{}|';
const args = process.argv.slice(2);

inquirer.registerPrompt('autocomplete', inquirerAutocompletePrompt);

const forever = () => true;
const sleep = milliseconds =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

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
  getWatch: 'get-watch',
  exec: 'exec',
  logHistory: 'log-history',
  logFuture: 'log-future',
  logMultipleFuture: 'mlog-future',
  help: 'help',
};

const oplist = [
  ops.get,
  ops.getWatch,
  ops.exec,
  ops.logHistory,
  ops.logFuture,
  ops.logMultipleFuture,
  ops.help,
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
        .map(line => line.trim().split(/\s+/))
        .filter(words => words[2] === 'Running')
        .map(words => words[0])
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
        .map(line => line.trim().split(/\s+/))
        .filter(words => words[2] === 'Running')
        .map(words => words[0])
        .filter(word => word !== 'NAME')
    );
  return askMultiple('Select a pod:', pods);
}

const help = [
  '',
  `${chalk.bold('kubectl.js')} is an wrapper for kubectl to get better UX.`,
  '',
  'Find more information at: https://github.com/linkeo/kubectl.js',
  '',
  `${chalk.bold('Usage:')} kubectl [op [args...]] `,
  '',
  `${chalk.bold('Operations (op):')}`,
  `  ${chalk.bold('(none)')}`,
  `    ${chalk.italic('Will ask you to choose one.')}`,
  '',
  `  ${chalk.bold('get')} namespaces | [namespace] [resource-type]`,
  `    ${chalk.italic('Print resources.')}`,
  '',
  `  ${chalk.bold('get-watch')} namespaces | [namespace] [resource-type]`,
  `    ${chalk.italic('Print resources every 1s.')}`,
  '',
  `  ${chalk.bold('exec')} [namespace] [pod]`,
  `    ${chalk.italic('Execute commands in a pod (bash)')}`,
  '',
  `  ${chalk.bold('log-history')} [namespace] [pod]`,
  `    ${chalk.italic('Print history logs of a pod.')}`,
  '',
  `  ${chalk.bold('log-future')} [namespace] [pod]`,
  `    ${chalk.italic('future logs of a pod.')}`,
  '',
  `  ${chalk.bold('mlog-future')} [namespace] [pod-keyword]`,
  `    ${chalk.italic('Print future logs of some pods.')}`,
  '',
  `  ${chalk.bold('help')}`,
  `    ${chalk.italic('Print help.')}`,
  '',
  '',
  `${chalk.bold('Resource Types:')}`,
  `  ${resourceTypes.join(', ')}.`,
].join('\n');

async function main() {
  ora(
    chalk.yellow(
      '[pre-release] This is a pre-release version, with limited functionality.'
    )
  ).warn();

  if (args[0] === '--help') {
    console.log(help);
    return;
  }

  const namespaces = await execa
    .stdout('kubectl', ['get', 'namespaces'])
    .then(raw =>
      raw
        .trim()
        .split('\n')
        .map(line => line.trim().split(/\s+/)[0])
        .filter(word => word !== 'NAME')
    );

  const operation = await ask('What do you want to do?', oplist);

  switch (operation) {
    case ops.help:
      {
        console.log(help);
      }
      break;
    case ops.get:
      {
        const resourceType = await ask(
          'Select an resource type:',
          resourceTypes
        );

        const namespace =
          resourceType !== 'namespaces'
            ? await ask('Select a namespace:', namespaces)
            : null;

        const output =
          resourceType !== 'namespaces'
            ? await execa.stdout('kubectl', [
                '-o',
                'wide',
                '-n',
                namespace,
                'get',
                resourceType,
              ])
            : await execa.stdout('kubectl', ['get', resourceType]);
        console.log(output);
      }
      break;
    case ops.getWatch:
      {
        const resourceType = await ask(
          'Select an resource type:',
          resourceTypes
        );

        const namespace =
          resourceType !== 'namespaces'
            ? await ask('Select a namespace:', namespaces)
            : null;

        const spinner = spinners.dots;
        let index = 0;
        const getFrame = () =>
          spinner.frames[(index = (index + 1) % spinner.frames.length)];

        logUpdate([chalk.cyan(getFrame()), chalk.gray('Pending...')].join(' '));
        const watcher = new PodsWatcher(namespace);
        do {
          await Promise.all([
            sleep(1000),
            (async () => {
              const output =
                resourceType !== 'namespaces'
                  ? await execa.stdout('kubectl', [
                      '-o',
                      'wide',
                      '-n',
                      namespace,
                      'get',
                      resourceType,
                    ])
                  : await execa.stdout('kubectl', ['get', resourceType]);
              watcher.update(output);
              const header = [
                chalk.cyan(getFrame()),
                chalk.gray('Watching...'),
              ].join(' ');
              logUpdate(`${header}\n${output}`);
            })().catch(() => {}),
          ]);
        } while (forever());
      }
      break;
    case ops.exec:
      {
        const namespace = await ask('Select a namespace:', namespaces);
        const pod = await selectPod(namespace);
        await execa('kubectl', ['-n', namespace, 'exec', '-it', pod, 'bash'], {
          stdio: 'inherit',
          reject: false,
        });
      }
      break;
    case ops.logHistory:
      {
        const namespace = await ask('Select a namespace:', namespaces);
        const pod = await selectPod(namespace);
        await execa('kubectl', ['-n', namespace, 'logs', pod], {
          stdout: 'inherit',
          stderr: 'inherit',
          reject: false,
        });
      }
      break;
    case ops.logFuture:
      {
        const namespace = await ask('Select a namespace:', namespaces);
        const pod = await selectPod(namespace);
        const e = execa(
          'kubectl',
          ['-n', namespace, 'logs', '-f', '--tail=1', pod],
          { reject: false }
        );
        e.stdout.pipe(process.stdout);
        e.stderr.pipe(process.stderr);
        await e;
      }
      break;
    case ops.logMultipleFuture:
      {
        const namespace = await ask('Select a namespace:', namespaces);
        const pods = await selectMultiplePod(namespace).then(match =>
          askFilter('Confirm pods you need:', match)
        );

        await bluebird.map(pods, pod => {
          const e = execa(
            'kubectl',
            ['-n', namespace, 'logs', '-f', '--tail=1', pod],
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
