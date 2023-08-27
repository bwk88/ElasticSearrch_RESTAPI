var Db  = require('./operations');
var DataSet_Registration = require('./dataSet_Reg');

const dboperations = require('./operations');
const axios = require('axios');

var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
const { request, response } = require('express/lib/express');
var app = express();
var router = express.Router();

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use('/api',router);

router.use((request,response,next) =>{
    // console.log('middleware');
    next();
})

app.get('/api/search',(req,res) =>{
  // Retrieve data from API endpoints
  router.route('/orders').get((request,response)=>{
      dboperations.getOrders().then(result => {
        response.json(result);
      })
    })
  
  router.route('/tags').get((request,response)=>{
      dboperations.getTags().then(result => {
        response.json(result);
      })
    })
  
  router.route('/subtags').get((request,response)=>{
      dboperations.getSubTags().then(result => {
        response.json(result);
      })
    })
  
  router.route('/nodes').get((request,response)=>{
      dboperations.getNodes().then(result => {
        response.json(result);
      })
    })
  
  const endpoint1 = 'http://localhost:8090/api/orders';
  const endpoint2 = 'http://localhost:8090/api/tags';
  const endpoint3 = 'http://localhost:8090/api/subtags';
  const endpoint4 = 'http://localhost:8090/api/nodes';
  
  const requests = [axios.get(endpoint1), axios.get(endpoint2), axios.get(endpoint3),axios.get(endpoint4)];
  Promise.all(requests)
    .then(responses => {
      const data1 = responses[0].data;
      const data2 = responses[1].data;
      const data3 = responses[2].data;
      const data0 = responses[3].data;

      const joined = {};

      for(obj1 of data1){
        const pk = obj1.MID;
        
        const obj2 = data2.find(obj=>obj.MID === pk);

        if(obj2){``
          const tagID = obj2.TID;

          const obj3 = data3.find(obj=> obj.TID == tagID);

          if(obj3){
            const tags = {...obj2};
            const subtags = {...obj3};
            
            const Nodes = data0.filter(obj=>obj.MID === pk).map(obj =>{
            const {id,...rest} = obj;
    
              return rest;
            });

            // console.log(Nodes);
            const joinObj = {...obj1,tags,subtags,Nodes};
    
            joined[pk] = joinObj;
          }
        }
      }
      
      res.setHeader('Content-Type','application/json');
      
      res.send(JSON.stringify(joined));
    })
    .catch(error => {
      console.error(error);
    });
})

var port = process.env.PORT || 8090;
app.listen(port);
console.log('Order API is running at ' + port);

const { Client } = require('@elastic/elasticsearch');
const { json } = require('express/lib/response');
const client = new Client({
  node: 'http://localhost:9200',
  auth: {
    username: 'elastic',
    password: 'cp4TgvCR5S8x3-Ux-B1M'
  },
})
const createIndex = async function(indexName){
  return await client.indices.create({
      index: indexName
  });
}

async function updateIndex() {
  const res = await axios.get('http://localhost:8090/api/search');
  const newData = res.data;

  const indexExists = await client.indices.exists({index: 'dvindex'});

  if(!indexExists){
    await client.indices.create({
      index: 'dvindex'
    })
    console.log('new index created');
  }

  // Fetch all documents currently indexed in dvindex
  const currentDataResponse = await client.search({
    index: 'dvindex',
    size: 10000, // Increase if necessary to fetch all documents
  });
  const currentData = currentDataResponse.hits.hits.map(hit => hit._source);

  // Group new data into updates and inserts
  const updates = [];
  const inserts = [];

  for (const [id, doc] of Object.entries(newData)) {
    // console.log(currentData.some(curr => curr.MID === id));
    if (currentData.some(curr => curr.MID === id)) {
      // Document exists in index, update it
      console.log(doc);
      updates.push({ update: { _index: 'dvindex', _id: id } });
      updates.push({ doc: doc });
    } else {
      // Document does not exist in index, insert it
      // console.log(doc);
      inserts.push({ index: { _index: 'dvindex', _id: id } });
      inserts.push(doc);
    }
  }

  // Delete documents that are not in the new data
  const deletedDocs = currentData.filter(doc => !newData[doc.MID]);

  if (deletedDocs.length > 0) {
    const deleteResponse = await client.deleteByQuery({
      index: 'dvindex',
      body: {
        query: {
          terms: { MID: deletedDocs.map(doc => doc.MID) }
        }
      }
    });
    console.log(`Deleted ${deleteResponse.deleted} documents`);
  }

  // Index updates and inserts
  const operations = [...updates, ...inserts];
  const bulkResponse = await client.bulk({ refresh: true, body: operations });

  if (bulkResponse.errors) {
    // Handle errors
    console.error(bulkResponse.errors);
  }

  const count = await client.count({ index: 'dvindex' });
  console.log(count);
}
// updateIndex();


function deleteIndex(){
  client.indices.delete({
    index: 'dvindex',
  }).then(function(resp) {
    console.log("Successful query!");
    console.log(JSON.stringify(resp, null, 4));
  }, function(err) {
    console.trace(err.message);
  });
}

// deleteIndex()


async function testSearch () {
  const result = await client.search({
   index:'dvindex',
   scroll:'5s',
   body: {
    query: {
      multi_match: { 
       query: 'Lob',
       type: 'phrase_prefix'
    }
    }
   }
  })

  console.log(result.hits.hits)
}

// testSearch();

router.get('/searchIndex',(req,res)=>{
  updateIndex();
  const term = req.query.q;

  client.search({
    index: 'dvindex',
    body:{
      query:{
        multi_match:{
          query:term,
          type:'phrase_prefix'
        }
      }
    }
  }).then(results=>{
    const hits = results.hits.hits;
    const IDs =[];
    // console.log(hits);
    hits.forEach((arrObj) => {
      // if(arrObj._source.MID == 213){
      //   console.log("present");
      // }
      IDs.push(arrObj._source.MID)
    });
    res.send(hits)
  }).catch(err=>{
    console.log(err);
  })
})

async function getCount(){
  const count = await client.count({ index: 'dvindex' })
  console.log(count)
}
// getCount();

