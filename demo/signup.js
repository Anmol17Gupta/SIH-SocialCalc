async function signup(event) {
    event.preventDefault();
    console.log("Signing up...");

    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    console.log(firstName + " " + lastName + " " + username + " " + password);

    try {
        const response = await fetch("http://localhost:3000/api/v1/user/signup", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstname: firstName,
                lastname: lastName,
                username: username, 
                password: password,  
            }),
        });

        if (response.status === 200) {  
            window.location.href = "login.html";
        } else {
            const errorData = await response.json(); 
            alert(`Sign up failed: ${errorData.message || "Please try again."}`);
        }
    } catch (error) {
        console.error("There was an error with the fetch operation:", error);
        alert("Something went wrong. Please try again.");
    }
}

document.getElementById("signupForm").addEventListener("submit", signup);

