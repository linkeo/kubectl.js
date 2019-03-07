# kubectl.js

kubectl.js is an wrapper for kubectl to get better UX.

## Usage

```bash
> kubectl [op [args...]]
```

## Operations

- `(none)`  
    Will ask you to choose one.

- `get namespaces | [namespace][resource-type]`  
    Print resources.

- `get-watch namespaces | [namespace][resource-type]`  
    Print resources every 1s.

- `exec [namespace][pod]`  
    Execute commands in a pod (bash)

- `log-history [namespace][pod]`  
    Print history logs of a pod.

- `log-future [namespace][pod]`  
    future logs of a pod.

- `mlog-future [namespace][pod-keyword]`  
    Print future logs of some pods.

- `help`  
    Print help.

## Resource Types

all, deployments, endpoints, events, jobs, namespaces, nodes, pods, replicasets, services, statefulsets, storageclasses.
