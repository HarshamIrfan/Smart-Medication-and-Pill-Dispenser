document.getElementById("medication-form").addEventListener("submit", function(event) {
    event.preventDefault();
    const name = document.getElementById("medication-name").value;
    const dose = document.getElementById("dose").value;
    const time = document.getElementById("time").value;
    if (name && dose && time) {
        addToLog(name, dose, time);
        clearForm();
    } else {
        alert("Please fill out all fields.");
    }
});
function addToLog(name, dose, time) {
    const log = document.getElementById("medication-log");
    const newRow = document.createElement("tr");
    newRow.innerHTML = `
        <td>${name}</td>
        <td>${dose}</td>
        <td>${time}</td>
    `;
    log.appendChild(newRow);
}
function clearForm() {
    document.getElementById("medication-name").value = "";
    document.getElementById("dose").value = "";
    document.getElementById("time").value = "";
}
