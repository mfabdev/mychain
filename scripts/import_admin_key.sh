#!/bin/bash

# Import admin key using --source flag
cat > /tmp/admin_mnemonic.txt << 'EOF'
focus scrap napkin rifle trigger gravity glide work robot shrug mystery eight escape govern shoulder answer rebel play frozen boy salon undo debris sense
EOF

mychaind keys add admin --recover --source /tmp/admin_mnemonic.txt --keyring-backend test

rm /tmp/admin_mnemonic.txt

# Display the key
mychaind keys show admin --keyring-backend test