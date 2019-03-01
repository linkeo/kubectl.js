# kubectl.js

A nice wrapper on kubectl. Provide some convenient command.

## Features

- Interactively use kubectl: You want to do `kubectl exec`, then choose a pod to do it.
- Can fill prompts by command arguments. (Means you can prefill some question when you typing this command)

## Installation

```bash
> npm i -g kubectl.js
```

## Usage

```bash
> kubejs
```

- At first, you will be asked to choose a namespace to run other command on.
- Then you will be asked to choose an operation to execute.

or

```bash
> kubejs mynamespace exec
```

- This time, first two prompts will be prefilled if the arguments is valid.

## Commands

### Command: `get`

You will be as to choose one type of resources.

Will call this command internally:

```bash
> kubectl -n <namespace> get <resource type>
```

### Command: `exec`

You will be as to choose a pod in the namespace you chosed at first.

Will call this command internally to exec container:

```bash
> kubectl -n <namespace> exec -it <pod> bash
```

### Command : `log (history only)`

You will be as to choose a pod in the namespace you chosed at first.

Will call this command internally to print logs already writen in this pod:

```bash
> kubectl -n <namespace> log <pod>
```

### Command : `log (future only)`

You will be as to choose a pod in the namespace you chosed at first.

Will call this command internally to follow logs will be writen in this pod:

```bash
> kubectl -n <namespace> log -f <pod>
```

### Command : `log (future only, multiple pods)`

You will be as to choose multiple pods. This will be two steps: first type keywords to filter out fewer pods, then choose exactly the pods you want (*The second step cannot be prefilled*).

Will call this command internally on each pods to follow the logs:

```bash
> kubectl -n <namespace> log -f <pod>
```
