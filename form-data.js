const formData = new FormData(form);

const btn = document.querySelector('#register-btn');
const form = document.querySelector('#register-form');


btn.addEventListener('click', (e) => {
    // prevent the form from submitting
    e.preventDefault();

    // show the form values
    const formData = new FormData(form);
    const values = [...formData.entries()];
    console.log(values);
});

const messageEl = document.querySelector('#message');

btn.addEventListener('click', (e) => {
    e.preventDefault();
    subscribe();
});

const subscribe = async () => {
    try {
        let response = await fetch('./connect.js', {
        method: 'POST',
        body: new FormData(form),
        });
        const result = await response.json();

        showMessage(result.message, response.status == 200 ? 'success' : 'error');
    } catch (error) {
        showMessage(error.message, 'error');
    }
};

const showSuccessMessage = (message, type = 'success') => {
    messageEl.innerHTML = `
        <div class="alert alert-${type}">
        ${message}
        </div>
    `;
};

let response = await fetch('./connect.js', {
    method: 'POST',
    body: new FormData(form),
});

const result = await response.json();
showMessage(result.message, response.status == 200 ? 'success' : 'error');

const showMessage = (message, type = 'success') => {
    messageEl.innerHTML = `
        <div class="alert alert-${type}">
        ${message}
        </div>
    `;
};