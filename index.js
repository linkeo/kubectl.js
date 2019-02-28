#!/usr/bin/env node
const execa = require('execa');
const ora = require('ora');
const inquirer = require('inquirer');
const inquirerAutocompletePrompt = require('inquirer-autocomplete-prompt');
const Conf = require('conf');
const chalk = require('chalk');

inquirer.registerPrompt('autocomplete', inquirerAutocompletePrompt);

const conf = new Conf();
const find = (list, value) => {
  const index = list.indexOf(value);
  return index !== -1 ? index : undefined;
};

const ask = (key, message, choices) =>
  inquirer
    .prompt([
      {
        type: 'autocomplete',
        message,
        source: async (answers, input) =>
          choices.filter(choice => choice.startsWith(input || '')),
        default: find(choices, conf.get(key)),
        name: 'input',
      },
    ])
    .then(res => {
      conf.set(key, res.input);
      return res.input;
    });

const ops = [
  'get',
  // 'describe',
  // 'create',
  // 'update',
  // 'delete',
  // 'log',
  // 'rolling-update',
  'exec',
  // 'port-forward',
  // 'proxy',
  // 'run',
  // 'expose',
  // 'label',
  // 'config',
  // 'cluster-info',
  // 'api-versions',
  // 'version',
  // 'help',
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

  const namespace = await ask('namespace', 'Select a namespace:', namespaces);
  const operation = await ask('operation', 'What do you want to do?', ops);

  switch (operation) {
    case 'get':
      {
        const resourceType = await ask(
          'resourceType',
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
    case 'exec':
      {
        const pods = await execa
          .stdout('kubectl', ['-n', namespace, 'get', 'pods'])
          .then(raw =>
            raw
              .trim()
              .split('\n')
              .map(line => line.trim().split(/\s+/)[0])
              .filter(word => word !== 'NAME')
          );
        const pod = await ask('pod', 'Select a pod:', pods);
        await execa('kubectl', ['-n', namespace, 'exec', '-it', pod, 'bash'], {
          stdio: 'inherit',
          reject: false,
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
