<?php

$servername = "localhost:3306";
$serverusername = "admin";
$serverpassword = "LL0921jj";
$dbname = "barterBetterDb";

$username = $_POST['username'];
$email = $_POST['email'];
$password = $_POST['password'];
$confirm = $_POST['confirm'];

$conn = new mysqli($servername, $serverusername, $serverpassword, $dbname);
// Check connection
if ($conn->connect_error) {
  die("Connection failed: " . $conn->connect_error);
}

$sql = "INSERT INTO `users`(`uid`, `username`, `email`, `password`, `confirm`, `timestamp`) VALUES ('NULL','$username','$email','$password','$confirm',current_timestamp())";

if ($conn->query($sql) === TRUE) {
  echo "You have successfully registered! - ";
  echo " Please confirm your email address...";
} else {
  echo "Error: " . $sql . "<br>" . $conn->error;
}

$conn->close();
header("Location: ./login.html");
exit();
?>