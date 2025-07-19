
#!/bin/bash
echo "🚀 Checking update ..."
claude update

echo "🚀 Starting claude code irrestrict..."
claude --dangerously-skip-permissions \
    --model sonnet \
    $@
