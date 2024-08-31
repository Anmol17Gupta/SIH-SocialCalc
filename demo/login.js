document.getElementById("loginForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Replace with actual authentication logic
    if (username === "admin" && password === "password") {
        localStorage.setItem("loggedIn", "true");
        window.location.href = "index.html";
    } else {
        alert("Invalid username or password");
    }
});
