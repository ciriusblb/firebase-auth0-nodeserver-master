// Dependencies
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');
const firebaseAdmin = require('firebase-admin');
// Config
const config = require('./config');

module.exports = function(app) {
  // Auth0 athentication middleware
  /*
    Configura la verificación de autenticación 
    para garantizar que solo los usuarios que 
    hayan iniciado sesión puedan acceder a las rutas 
    con jwtCheckmiddleware
  */
  const jwtCheck = jwt({
    secret: jwks.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://${config.AUTH0_DOMAIN}/.well-known/jwks.json`
    }),
    audience: config.AUTH0_API_AUDIENCE,
    issuer: `https://${config.AUTH0_DOMAIN}/`,
    algorithm: 'RS256'
  });

  // Initialize Firebase Admin with service account
  /*
    Inicializa el SDK de administrador de Firebase 
    con la clave privada generada a partir 
    de la cuenta de servicio del proyecto de Firebase
  */
  const serviceAccount = require(config.FIREBASE_KEY);
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
    databaseURL: config.FIREBASE_DB
  });


var user = firebaseAdmin.auth().currentUser;

if (user) {
  // User is signed in.
  console.log("user ",user);
} else {
  console.log("mo user ",user);

  // No user is signed in.
}


  // GET object containing Firebase custom token-- 
  //devuelve una ficha personalizada de firebase
  app.get('/auth/firebase', jwtCheck, (req, res) => {
    // Create UID from authenticated Auth0 user
    const uid = req.user.sub;
    console.log('/auth/firebase/:uid ',uid);
    // Mint token using Firebase Admin SDK
    firebaseAdmin.auth().createCustomToken(uid)
      .then(customToken =>{
        // Response must be an object or Firebase errors
        // console.log('firebase customToken ',customToken);
        res.json({firebaseToken: customToken})
      })
      .catch(err => 
        res.status(500).send({
          message: 'Something went wrong acquiring a Firebase token.',
          error: err
        })
      );
  });

  // Set up dogs JSON data for API
  const dogs = require('./dogs.json');
  const getDogsBasic = () => {
    const dogsBasicArr = dogs.map(dog => {
      return {
        rank: dog.rank,
        breed: dog.breed,
        image: dog.image
      }
    });
    return dogsBasicArr;
  }

  // GET dogs (public)
  app.get('/api/dogs', (req, res) => {
    res.send(getDogsBasic());
  });

  // GET dog details by rank (private)
  app.get('/api/dog/:rank', jwtCheck, (req, res) => {
    const rank = req.params.rank * 1;
    const thisDog = dogs.find(dog => dog.rank === rank);
    console.log('thisDog ',thisDog);
    res.send(thisDog);
  });
};
