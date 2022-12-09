<?php

$servername = "localhost:3306";
$serverusername = "admin";
$serverpassword = "LL0921jj";
$dbname = "barterBetterDb";

$username = $_POST['username'];
$title = $_POST['title'];
$subtitle = $_POST['subtitle'];
$body = $_POST['body'];
$images = $_POST['images'];
$region = $_POST['region'];
$category = $_POST['category'];

$conn = new mysqli($servername, $serverusername, $serverpassword, $dbname);
// Check connection
if ($conn->connect_error) {
  die("Connection failed: " . $conn->connect_error);
}

$sql = "INSERT INTO `posts`(`id`, `title`, `subtitle`, `body`, `images`, `region`, `category`, `timestamp`) VALUES ('NULL','$title', '$subtitle', '$body', '$images', '$region', '$category', current_timestamp())";

if ($conn->query($sql) === TRUE) {
  echo "Your post was successfully submitted!";
} else {
  echo "Error: " . $sql . "<br>" . $conn->error;
}

$conn->close();
header("Location: ./index.html");
exit();
?>