async function validate(event) {
    event.preventDefault();
    console.log("hi");

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("http://localhost:3000/api/v1/user/signin", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                password: password,
            }),
        });

        if (response.status === 200) {
            localStorage.setItem("loggedIn",true);
            window.location.href = "index.html";
        } else {
            alert("Invalid username or password");
        }
    } catch (error) {
        console.error("There was an error with the fetch operation:", error);
        alert("Something went wrong. Please try again.");
    }
}

document.getElementById("loginForm").addEventListener("submit", validate);

