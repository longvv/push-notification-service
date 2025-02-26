const SequelizeAuto = require('sequelize-auto');

const auto = new SequelizeAuto('notification_db', 'admin', 'admin123', {
  host: 'localhost',
  dialect: 'postgres',
  directory: './src/models/generated', // where to write the models
  port: 5432,
  caseModel: 'p', // pascal case for model names
  caseFile: 'c', // camel case for file names
  singularize: true, // transforms plural table names to singular model names
  additional: {
    timestamps: false,
    // You can add other model options here
  },
});

auto.run().then(data => {
  console.log('Models generated successfully!');
});