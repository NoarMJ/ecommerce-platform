const { PrismaClient } = require('../node_modules/.prisma/client-reconciliation');

const prisma = new PrismaClient();

module.exports =  prisma;
