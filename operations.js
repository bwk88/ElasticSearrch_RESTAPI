var config = require('./dbconfig');
const sql = require('mssql');


async function getOrders() {
    try {
        let pool = await sql.connect(config);
        let products = await pool.request().query("SELECT Name,MID,Annotation1,AcquisitionSource,SourceDetails from DataSet_Registration");
        return products.recordsets;
    }
    catch (error) {
        console.log(error);
    }
}

async function getTags() {
    try {
        let pool = await sql.connect(config);
        let products = await pool.request().query("SELECT st.TID,st.MID FROM DataSetTags st JOIN DataSet_Registration d on d.MID = st.MID");
        return products.recordsets;
    }
    catch (error) {
        console.log(error);
    }
}

async function getSubTags() {
    try {
        let pool = await sql.connect(config);
        let products = await pool.request().query("SELECT STID from SubTags");
        return products.recordsets;
    }
    catch (error) {
        console.log(error);
    }
}

async function getNodes() {
    try {
        let pool = await sql.connect(config);
        let products = await pool.request().query("SELECT ID,MID,NodeID,Label from DataSet_Nodes");
        return products.recordsets;
    }
    catch (error) {
        console.log(error);
    }
}

module.exports = {
    getOrders: getOrders,
    getTags: getTags,
    getSubTags:getSubTags,
    getNodes:getNodes
}