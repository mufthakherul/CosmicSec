# CosmicSec CLI Plugins

## Plugin directory layout

Plugins are stored in:

```text
~/.cosmicsec/plugins/<plugin-name>/
```

Each plugin scaffold contains:

- `plugin.yaml`
- `__init__.py`
- `commands.py`
- `parser.py`

## Create a plugin

```bash
cosmicsec-agent plugin create my-custom-plugin --author "Your Name"
```

## Install from local path

```bash
cosmicsec-agent plugin install ./my-custom-plugin
```

## Manage plugins

```bash
cosmicsec-agent plugin list
cosmicsec-agent plugin search custom
cosmicsec-agent plugin remove my-custom-plugin
```
