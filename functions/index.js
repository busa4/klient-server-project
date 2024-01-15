const mysql = require('mysql');
const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require("crypto");
const cors = require('cors')

const admin = require("firebase-admin");
const functions = require("firebase-functions");

const {logger} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");

const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

initializeApp();


const app = express();


app.use(function(request,response,next) {
  response.append("Access-Control-Allow-Origin","*");
  response.append("Access-Control-Allow-Methods","GET");
  response.append("Access-Control-Allow-Headers","Content-Type");
  response.append("Content-Type","application/json");
  next();
});
app.use(cors())
exports.app = functions.https.onRequest(app);

const port = 3002;

app.listen(port,function() {
  console.log("Server is running on the port " + port);
});

app.get("/", function(request,response) {
  response.send("Hello, stranger!");
});


const db = mysql.createConnection({
  host: 'sql11.freesqldatabase.com',
  user: 'sql11677105',
  password: '3m9PXWqa6k',
  database: 'sql11677105'
});

db.connect((err) => {
  if (err) {
      console.error('Andmebaasiga ühendamine ebaõnnestus: ' + err.stack);
      return;
  }
  console.log('Ühendatud MySQL andmebaasiga ID ' + db.threadId);
});

app.get('/stop-areas', (req, res) => {
  const piirkonnaNimi = req.query.piirkonnaNimi || '';
  console.log('Päring saadud, piirkonnaNimi:', piirkonnaNimi);
  const query = 'SELECT DISTINCT stop_area FROM stops';
  const values = [piirkonnaNimi];
  db.query(query, values, (err, results) => {
      if (err) {
          console.error('Päringu töötlemine ebaõnnestus: ' + err.stack);
          res.status(500).send('Serveri viga');
          return;
      }
      console.log('Vastus saadetud:', results);
      res.json(results);
  });
});

app.get('/stops', (req, res) => {
  const piirkonnaNimi = req.query.piirkonnaNimi || '';
  console.log('Päring saadud /stops, piirkonnaNimi:', piirkonnaNimi);
  const query = 'SELECT DISTINCT stop_name FROM stops WHERE stop_area = ?';
  const values = [piirkonnaNimi];
  db.query(query, values, (err, results) => {
      if (err) {
          console.error('Päringu töötlemine ebaõnnestus /stops: ' + err.stack);
          res.status(500).send('Serveri viga /stops');
          return;
      }
      console.log('Vastus saadetud /stops:', results);
      res.json(results);
  });
});

app.get('/shedulequery', (req, res) => {
  const busNumber = req.query.busNumber || '';
  const stopName = req.query.stopName || '';
  const stopCity = req.query.stopCity || '';
  console.log('Päring saadud /shedulequery, busNumber:' + busNumber + stopName + stopCity);
  const firstQuery = 'SELECT DISTINCT stop_id FROM stops WHERE stop_name = ? AND stop_area = ?';
  const firstValues = [stopName, stopCity];
  db.query(firstQuery, firstValues, (err, results) => {
      if (err) {
          console.error('Päringu töötlemine ebaõnnestus /stops: ' + err.stack);
          res.status(500).send('Serveri viga /stops');
          return;
      }
      if (results.length > 0) {
          const stopid = parseInt(results[0].stop_id.trim());
          console.log('stopid:', stopid);
          const secondQuery = 'SELECT stop_times.departure_time FROM stop_times JOIN trips ON stop_times.trip_id = trips.trip_id JOIN routes ON trips.route_id = routes.route_id WHERE stop_times.stop_id = ? AND routes.route_short_name = ?';
          const secondValues = [stopid, busNumber];
          db.query(secondQuery, secondValues, (err, results) => {
              if (err) {
                  console.error('Päringu 2 töötlemine ebaõnnestus /stops: ' + err.stack);
                  res.status(500).send('Serveri 2 viga /stops');
                  return;
              }
              const departureTimes = results.map(result => result.departure_time);
              console.log('Vastus saadetud /departureTimes:', departureTimes);
              res.json(departureTimes);
          });
      } else {
          res.json([]);
      }
  });
});

app.get('/stops-query', (req, res) => {
  const stopName = req.query.stopName || '';
  const stopCity = req.query.stopCity || '';
  console.log('Päring saadud /stops-query, stop_name:', stopName);
  const query = 'SELECT DISTINCT stop_id FROM stops WHERE stop_name = ? AND stop_area = ?';
  const values = [stopName, stopCity];
  db.query(query, values, (err, results) => {
      if (err) {
          console.error('Päringu töötlemine ebaõnnestus /stops: ' + err.stack);
          res.status(500).send('Serveri viga /stops');
          return;
      }
      if (results.length > 0) {
          const stopid = parseInt(results[0].stop_id.trim());
          console.log('Vastus saadetud /stopid:', stopid);
          const secQuery = 'SELECT DISTINCT routes.route_short_name FROM stop_times JOIN trips ON stop_times.trip_id = trips.trip_id JOIN routes ON trips.route_id = routes.route_id WHERE stop_times.stop_id = ?;';
          const secValues = [stopid];
          db.query(secQuery, secValues, (err, results) => {
              if (err) {
                  console.error('Päringu 2 töötlemine ebaõnnestus /stops: ' + err.stack);
                  res.status(500).send('Serveri 2 viga /stops');
                  return;
              }
              const routeShortNames = results.map(result => result.route_short_name);
              console.log('Vastus saadetud /rs:', routeShortNames);
              res.json(routeShortNames);
          });
      } else {
          res.json([]);
      }
  });
});


// app.listen(3000, () => {
//   console.log("Server started")
// })