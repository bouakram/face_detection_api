import express from 'express'
import bodyParser from 'body-parser'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import knex from 'knex'
import { config } from 'dotenv'
config()

// connection to pg database
const pg = knex({
    client: 'pg',
    connection: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT,
        user: process.env.DB_USER || 'postgres',
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
    },
});

// initializing the express app
const app = express()

// middlewares
app.use(cors())
app.use(bodyParser.json())

// routes
app.get('/', (req, res) => {
    res.send("app running...")
})

app.get('/profile/:id', (req, res) => {
    const { id } = req.params
    res.send(id)
})

app.post('/sign-in', async (req, res) => {
    const { email, password } = req.body
    let user
    await pg.select('*').from('users').where({ email: email }).then(data => user = data[0])
    console.log(user)
    if (bcrypt.compareSync(password, user.password)) {
        res.json({ message: 'log-in success' })
    } else {
        res.status(400).json({ message: 'log-in failed' })
    }
})

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)
    await pg('users')
        .returning('*')
        .insert({
            username,
            email,
            password: hashedPassword,
            joined: new Date()
        })
        .then(user => res.json(user[0]))
})

app.post('/detect', (req, res) => {
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // In this section, we set the user authentication, user and app ID, model details, and the URL
    // of the image we want as an input. Change these strings to run your own example.
    //////////////////////////////////////////////////////////////////////////////////////////////////

    // Your PAT (Personal Access Token) can be found in the Account's Security section
    const PAT = process.env.PAT;
    // Specify the correct user_id/app_id pairings
    // Since you're making inferences outside your app's scope
    const USER_ID = process.env.USER_ID;
    const APP_ID = process.env.APP_ID;
    // Change these to whatever model and image URL you want to use
    const MODEL_ID = process.env.MODEL_ID;
    const MODEL_VERSION_ID = process.env.MODEL_VERSION;
    // 'https://samples.clarifai.com/metro-north.jpg'
    const IMAGE_URL = req.body.image;

    ///////////////////////////////////////////////////////////////////////////////////
    // YOU DO NOT NEED TO CHANGE ANYTHING BELOW THIS LINE TO RUN THIS EXAMPLE
    ///////////////////////////////////////////////////////////////////////////////////

    const raw = JSON.stringify({
        "user_app_id": {
            "user_id": USER_ID,
            "app_id": APP_ID
        },
        "inputs": [
            {
                "data": {
                    "image": {
                        "url": IMAGE_URL
                    }
                }
            }
        ]
    });

    const requestOptions = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Authorization': 'Key ' + PAT
        },
        body: raw
    };

    // NOTE: MODEL_VERSION_ID is optional, you can also call prediction with the MODEL_ID only
    // https://api.clarifai.com/v2/models/{YOUR_MODEL_ID}/outputs
    // this will default to the latest version_id
    // .outputs[0].model
    fetch("https://api.clarifai.com/v2/models/" + MODEL_ID + "/versions/" + MODEL_VERSION_ID + "/outputs", requestOptions)
        .then(response => response.json())
        .then(result => res.json(result))
        .catch(error => console.log('error', error));
})

// starting the server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => { console.log("app listening on port: " + PORT) })