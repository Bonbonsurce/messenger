document.addEventListener('DOMContentLoaded', async function() {
    const response = await fetch('/message_show');
    const htmlData = await response.text();

    const dialogsSection = document.querySelector('.dialogs-section');
    dialogsSection.innerHTML = htmlData;
});