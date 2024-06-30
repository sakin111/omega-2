const express = require("express")
const cors = require("cors")
const jwt = require('jsonwebtoken');
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000;




app.use(express.json())
app.use(cors())


const uri = `mongodb+srv://${process.env.MONGO_user}:${process.env.MONGO_pass}@cluster0.ubtwufv.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


async function run() {
  try {

    const SliderCollection = client.db("OmegaBanner").collection("Banner");
    const RoomCollection = client.db("OmegaBanner").collection("Rooms");
    const UserCollection = client.db("OmegaUsers").collection("users");
    const ProfileCollection = client.db("OmegaUsers").collection("profile");



// jwt post
app.post('/jwt', async (req, res) => {
  try {
    const user = req.body;
    const token = jwt.sign(user, process.env.JWT_access_TOKEN, { expiresIn: '360d' });
    res.send({ token });
  } catch (error) {
    console.error('Error generating JWT token:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).send({ message: 'Unauthorized access: No token provided' });
    }
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.JWT_access_TOKEN, (err, decoded) => {
      if (err) {
        console.error('Error verifying JWT token:', err);
        return res.status(401).send({ message: 'Unauthorized access: Invalid token' });
      }
      req.decoded = decoded;
      next();
    });
  } catch (error) {
    console.error('Error in verifyToken middleware:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
};

// Middleware to verify admin access
const verifyAdmin = async (req, res, next) => {
  try {
    if (!req.decoded || !req.decoded.email) {
      return res.status(401).send({ message: 'Unauthorized access: No user information found' });
    }
    const email = req.decoded.email;
    const user = await UserCollection.findOne({ email });
    if (!user) {
      return res.status(401).send({ message: 'Unauthorized access: User not found' });
    }
    if (user.role !== 'admin') {
      return res.status(403).send({ message: 'Forbidden access: User is not an admin' });
    }
    next();
  } catch (error) {
    console.error('Error verifying admin:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
};






// data side 

    app.get("/slider", async (req, res) => {
      try {
        const result = await SliderCollection.find().toArray();
        res.send(result); // Send the data as JSON response
      } catch (error) {
        console.error("Error fetching slider data:", error);
        res.status(500).json({ error: "Internal Server Error" }); // Handle errors gracefully
      }
    });

    app.get("/slider/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const  options = {
          projection:{ image:1 , name:1, location:1, description:1,rooms:1,ratings:1}
        }
        const result = await SliderCollection.findOne(query, options);
       
        res.send(result)
      } catch (error) {
        console.error("Error fetching slider data:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    })


  app.post("/users", async(req,res) =>{
    const user = req.body
    const query = {email: user.email}
    const existUser = await UserCollection.findOne(query)
    if(existUser){
     return res.send({message:'user already exist', insertedId:null})
    }
    const result = await UserCollection.insertOne(user)
    res.send(result);
  });

  

  app.get("/users" ,verifyToken, verifyAdmin, async(req,res) =>{
    try {
        const result = await UserCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching slider data:", error);
        res.status(500).json({ error: "Internal Server Error" }); // Handle errors gracefully
      }
  })


// for profile 


  app.post("/updateProfile", async (req, res) => {
    try {
        const profiles = req.body;
        const result = await ProfileCollection.insertOne(profiles);
        res.send(result);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred while updating the profile." });
    }
});

  

  


  app.get('/users/admin/:email', verifyToken, verifyAdmin, async (req, res) => {
    try {
      // Check for authentication
      if (!req.decoded || !req.decoded.email) {
        return res.status(401).send({ message: 'Unauthorized access' });
      }
      
      // Check if the provided email matches the decoded email
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(401).send({ message: 'Unauthorized access' });
      }
      
      // Query the database for the user's admin status
      const user = await UserCollection.findOne({ email });
      let admin = false;
      if (user) {
        admin = user.role === 'admin';
      }
      
      // Send the admin status in the response
      res.send({ admin });
    } catch (error) {
      console.error('Error fetching admin status:', error);
      res.status(500).send({ message: 'Internal Server Error' });
    }
  });
  
  
  
  

// user update


app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        role: 'admin'
      }
    }
    const result = await UserCollection.updateOne(filter, updatedDoc);
    res.send(result);
  } catch (error) {
    console.error('Error updating user role to admin:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// user delete 

app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await UserCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// hotel add




app.post("/rooms", async(req, res) =>{
  const rooms = req.body
  const result = await RoomCollection.insertOne(rooms)
  res.send(result);
})


    app.get("/rooms", async (req, res) => {
      try {
        const result = await RoomCollection.find().toArray();
        res.send(result); 
      } catch (error) {
        console.error("Error fetching slider data:", error);
        res.status(500).json({ error: "Internal Server Error" }); 
      }
    });

app.get("/rooms/:id" , async(req,res) =>{
       try {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const  options = {
          projection:{ imageUrl:1 , hotelName:1, location:1, description:1,ratings:1,roomNumber:1,price:1, category:1}
        }
        const result = await RoomCollection.findOne(query, options);
       
        res.send(result)
      } catch (error) {
        console.error("Error fetching slider data:", error);
        res.status(500).json({ error: "Internal server error" });
      }
})




    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);



app.get("/", (req, res) => {
  res.send("the server is running on 5000")
})

app.listen(port, () => {
  console.log("hey the server is alright")
})