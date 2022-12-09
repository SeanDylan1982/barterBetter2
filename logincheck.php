<?php

$servername = "localhost:3306";
$serverusername = "admin";
$serverpassword = "LL0921jj";
$dbname = "barterBetterDb";

$email = $_POST['email'];
$password = $_POST['password'];

$conn = new mysqli($servername, $serverusername, $serverpassword, $dbname);
// Check connection
if ($conn->connect_error) {
  die("Connection failed: " . $conn->connect_error);
}

$sql = "SELECT email,password FROM users WHERE email='$email' AND password='$password'";

if ($conn->query($sql) === TRUE) {
  echo "You have successfully logged in!";
} else {
  echo "Error: " . $sql . "<br>" . $conn->error;
}

$conn->close();
header("Location: ./timeline.html");
exit();
?>