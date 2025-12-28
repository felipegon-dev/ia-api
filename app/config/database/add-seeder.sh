echo "Seeder name:"
read OPC
npx sequelize-cli seed:generate --name $OPC
