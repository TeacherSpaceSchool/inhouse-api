const { gql, ApolloServer,  } = require('apollo-server-express');
const { RedisPubSub } = require('graphql-redis-subscriptions');
const BalanceClient = require('./balanceClient');
const StoreBalanceItem = require('./storeBalanceItem');
const BalanceItem = require('./balanceItem');
const BonusManager = require('./bonusManager');
const BonusCpa = require('./bonusCpa');
const BalanceItemDay = require('./balanceItemDay');
const Cashbox = require('./cashbox');
const Characteristic = require('./characteristic');
const Category = require('./category');
const Promotion = require('./promotion');
const Client = require('./client');
const Cpa = require('./cpa');
const Doc = require('./doc');
const Factory= require('./factory');
const Installment = require('./installment');
const History = require('./history');
const MoneyArticle = require('./moneyArticle');
const MoneyFlow = require('./moneyFlow');
const MoneyRecipient = require('./moneyRecipient');
const Error = require('./error');
const ModelsError = require('../models/error');
const Faq = require('./faq');
const Salary = require('./salary');
const Store = require('./store');
const Task = require('./task');
const TypeCharacteristic = require('./typeCharacteristic');
const Item = require('./item');
const Warehouse = require('./warehouse');
const WayItem = require('./wayItem');
const Passport = require('./passport');
const Consultation = require('./consultation');
const Order = require('./order');
const Refund = require('./refund');
const Reservation = require('./reservation');
const Sale = require('./sale');
const User = require('./user');
const { verifydeuserGQL } = require('../module/passport');
const { GraphQLScalarType } = require('graphql');
const { withFilter } = require('graphql-subscriptions');
const { GraphQLUpload } = require('graphql-upload');
const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const depthLimit  = require('graphql-depth-limit')
const pubsub = new RedisPubSub();
module.exports.pubsub = pubsub;

const RELOAD_DATA = 'RELOAD_DATA';

const typeDefs = gql`
    scalar Upload
    scalar Date
    type Data {
        name: String
        value: String
    }
    input InputData {
        name: String
        value: String
    }
    type CurrencyBalance {
        amount: Float,
        currency: String
    }
    type ItemFromList {
        _id: ID
        name: String
        item: ID
        unit: String
        count: Float
        price: Float
        images: [String]
        amount: Float
        characteristics: [[String]]
        status: String
    }
    input ItemFromListInput {
        _id: ID
        name: String
        unit: String
        item: ID
        count: Float
        price: Float
        amount: Float
        characteristics: [[String]]
        status: String
    }
    type ReloadData {
        who: ID
        type: String
        ids: [ID]
        roles: [String]
        message: String
    }
    type Statistic {
        columns: [String]
        row: [StatisticData]
    }
    type StatisticData {
        _id: ID
        data: [String]
    }
    ${BalanceClient.type}
    ${StoreBalanceItem.type}
    ${BalanceItemDay.type}
    ${BalanceItem.type}
    ${Cashbox.type}
    ${BonusManager.type}
    ${BonusCpa.type}
    ${Characteristic.type}
    ${Cpa.type}
    ${Doc.type}
    ${Factory.type}
    ${Installment.type}
    ${MoneyArticle.type}
    ${MoneyFlow.type}
    ${MoneyRecipient.type}
    ${Salary.type}
    ${Store.type}
    ${Task.type}
    ${TypeCharacteristic.type}
    ${Warehouse.type}
    ${WayItem.type}
    ${Category.type}
    ${Client.type}
    ${Promotion.type}
    ${History.type}
    ${Error.type}
    ${Faq.type}
    ${Item.type}
    ${Passport.type}
    ${Order.type}
    ${Reservation.type}
    ${Refund.type}
    ${Sale.type}
    ${Consultation.type}
    ${User.type}
    type Mutation {
        ${Cashbox.mutation}
        ${Category.mutation}
        ${Client.mutation}
        ${Promotion.mutation}
        ${Error.mutation}
        ${Faq.mutation}
        ${Item.mutation}
        ${Passport.mutation}
        ${Order.mutation}
        ${Refund.mutation}
        ${Reservation.mutation}
        ${Sale.mutation}
        ${Consultation.mutation}
        ${User.mutation}
        ${BalanceItem.mutation}
        ${BonusManager.mutation}
        ${BonusCpa.mutation}
        ${Characteristic.mutation}
        ${Cpa.mutation}
        ${Doc.mutation}
        ${Factory.mutation}
        ${Installment.mutation}
        ${MoneyArticle.mutation}
        ${MoneyFlow.mutation}
        ${MoneyRecipient.mutation}
        ${Salary.mutation}
        ${Store.mutation}
        ${Task.mutation}
        ${TypeCharacteristic.mutation}
        ${Warehouse.mutation}
        ${WayItem.mutation}
    }
    type Query {
        ${Cashbox.query}
        ${Category.query}
        ${Client.query}
        ${Promotion.query}
        ${History.query}
        ${Passport.query}
        ${Order.query}
        ${Sale.query}
        ${Reservation.query}
        ${Refund.query}
        ${Consultation.query}
        ${User.query}
        ${Error.query}
        ${Faq.query}
        ${Item.query}
        ${BalanceClient.query}
        ${StoreBalanceItem.query}
        ${BalanceItemDay.query}
        ${BalanceItem.query}
        ${BonusManager.query}
        ${BonusCpa.query}
        ${Characteristic.query}
        ${Cpa.query}
        ${Doc.query}
        ${Factory.query}
        ${Installment.query}
        ${MoneyArticle.query}
        ${MoneyFlow.query}
        ${MoneyRecipient.query}
        ${Salary.query}
        ${Store.query}
        ${Task.query}
        ${TypeCharacteristic.query}
        ${Warehouse.query}
        ${WayItem.query}
    }
    type Subscription {
        reloadData: ReloadData
    }
`;

const resolvers = {
    Upload: GraphQLUpload,
    Date: new GraphQLScalarType({
        name: 'Date',
        description: 'Date custom scalar type',
        parseValue(value) {
            return new Date(value); // value from the client
        },
        serialize(value) {
            return new Date(value).getTime();
        },
        parseLiteral(ast) {
            if (ast.kind === Kind.INT) {
                return new Date(ast.value)
            }
            return null;
        },
    }),
    Query: {
        ...BalanceClient.resolvers,
        ...StoreBalanceItem.resolvers,
        ...BalanceItemDay.resolvers,
        ...Cashbox.resolvers,
        ...Category.resolvers,
        ...Client.resolvers,
        ...Promotion.resolvers,
        ...History.resolvers,
        ...Passport.resolvers,
        ...Order.resolvers,
        ...Reservation.resolvers,
        ...Refund.resolvers,
        ...Sale.resolvers,
        ...Consultation.resolvers,
        ...User.resolvers,
        ...Error.resolvers,
        ...Faq.resolvers,
        ...Item.resolvers,
        ...BalanceItem.resolvers,
        ...BonusManager.resolvers,
        ...BonusCpa.resolvers,
        ...Characteristic.resolvers,
        ...Cpa.resolvers,
        ...Doc.resolvers,
        ...Factory.resolvers,
        ...Installment.resolvers,
        ...MoneyArticle.resolvers,
        ...MoneyFlow.resolvers,
        ...MoneyRecipient.resolvers,
        ...Salary.resolvers,
        ...Store.resolvers,
        ...Task.resolvers,
        ...TypeCharacteristic.resolvers,
        ...Warehouse.resolvers,
        ...WayItem.resolvers,
    },
    Mutation: {
        ...Cashbox.resolversMutation,
        ...Category.resolversMutation,
        ...Client.resolversMutation,
        ...Promotion.resolversMutation,
        ...Passport.resolversMutation,
        ...Order.resolversMutation,
        ...Refund.resolversMutation,
        ...Reservation.resolversMutation,
        ...Sale.resolversMutation,
        ...Consultation.resolversMutation,
        ...User.resolversMutation,
        ...Error.resolversMutation,
        ...Faq.resolversMutation,
        ...Item.resolversMutation,
        ...BalanceItem.resolversMutation,
        ...BonusManager.resolversMutation,
        ...BonusCpa.resolversMutation,
        ...Characteristic.resolversMutation,
        ...Cpa.resolversMutation,
        ...Doc.resolversMutation,
        ...Factory.resolversMutation,
        ...Installment.resolversMutation,
        ...MoneyArticle.resolversMutation,
        ...MoneyFlow.resolversMutation,
        ...MoneyRecipient.resolversMutation,
        ...Salary.resolversMutation,
        ...Store.resolversMutation,
        ...Task.resolversMutation,
        ...TypeCharacteristic.resolversMutation,
        ...Warehouse.resolversMutation,
        ...WayItem.resolversMutation,
    },
    Subscription: {
        reloadData: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(RELOAD_DATA),
                (payload, variables, {user} ) => {
                    return (
                        user&&user.role&&user._id&&user._id.toString()!==payload.reloadData.who&&
                        (
                            payload.reloadData.roles.includes(user.role)||
                            payload.reloadData.ids.toString().includes(user._id.toString())
                        )
                    )
                },
            )
        },
    }
};

const loggerPlugin = {
    requestDidStart(requestContext) {
        console.log(requestContext.request.query);
    },
};

const run = async(app, httpServer)=>{
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const wsServer = new WebSocketServer({
        server: httpServer,
        path: '/graphql',
    });
    const serverCleanup = useServer({
        schema,
        context: async (ctx) => {
            if (ctx.connectionParams&&ctx.connectionParams.authorization) {
                let user = await verifydeuserGQL({headers: {authorization: ctx.connectionParams.authorization}}, {})
                return { user }
            }
            else return { user: {} }
        },
        onConnect: async (ctx) => {
            if (ctx.connectionParams&&ctx.connectionParams.authorization) {
                let user = await verifydeuserGQL({headers: {authorization: ctx.connectionParams.authorization}}, {})
                return { user }
            }
            else return { user: {} }
        },
    }, wsServer);
    const server = new ApolloServer({
        validationRules: [ depthLimit(10) ],
        playground: false,
        schema,
        context: async (ctx) => {
            if (ctx.connection) {
                return ctx.connection.context;
            }
            else if(ctx&&ctx.req) {
                ctx.res.header('ACCEPT-CH', 'UA-Full-Version, UA-Mobile, UA-Model, UA-Arch, UA-Platform, ECT, Device-Memory, RTT');
                let user = await verifydeuserGQL(ctx.req, ctx.res)
                return {req: ctx.req, res: ctx.res, user: user};
            }
        },
        plugins: [
            ApolloServerPluginDrainHttpServer({ httpServer }),
            {
                async serverWillStart() {
                    return {
                        async drainServer() {
                            await serverCleanup.dispose();
                        },
                    };
                },
            },
        ],
        formatError: async (err) => {
            console.error(err)
            let object = new ModelsError({
                err: `gql: ${err.message}`,
                path: JSON.stringify(err.path)
            });
            await ModelsError.create(object)
            return err;
        },
    })
    await server.start();
    server.applyMiddleware({ app, path : '/graphql', cors: false })
    return server
}

module.exports.run = run;
