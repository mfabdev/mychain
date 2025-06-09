# Unified Launch Script - Clean by Default

## Summary

The unified launch script (`scripts/unified-launch.sh`) has been updated to **clean blockchain data by default** to ensure a fresh transaction history on each launch.

## Key Changes

### Default Behavior
- **Before**: Script would keep existing blockchain data unless `--reset` was specified
- **After**: Script now cleans all blockchain data by default unless `--no-clean` is specified

### Command Usage

#### Clean Launch (Default)
```bash
./scripts/unified-launch.sh
```
This will:
- Stop any running blockchain processes
- Remove all blockchain data (including transaction history)
- Initialize a fresh blockchain from genesis
- Start with block 1 and empty transaction history

#### Keep Existing Data
```bash
./scripts/unified-launch.sh --no-clean
```
This will:
- Stop and restart the node
- Keep all existing blockchain data
- Continue from the current block height
- Preserve all transaction history

### Other Options
- `--dev` - Enable development mode (faster blocks)
- `--skip-dashboard` - Don't build/start web dashboard
- `--systemd` - Create and use systemd service
- `--aws` - AWS-specific configuration

### Why This Change?

The user requested that the script always use a clean version unless otherwise specified. This ensures:
1. Predictable starting state for testing
2. No accumulation of test transactions
3. Fresh transaction history each time
4. Consistent behavior across development sessions

### Transaction History

With the clean default:
- Each launch starts with 0 transactions
- Only new transactions will appear in the history
- No mint inflation transactions from previous runs
- Clean state for testing and development

## Date: June 8, 2025