echo "Migration name:"
read OPC
npx sequelize-cli migration:generate --name $OPC
