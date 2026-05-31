async function handleLogin(event) {
  event.preventDefault();

  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  const message = document.querySelector('#message');

  try {
    const data = await API.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    API.token = data.token;
    location.href = '/profile.html';
  } catch (error) {
    message.textContent = error.message;
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  const displayName = document.querySelector('#displayName').value.trim();
  const message = document.querySelector('#message');

  try {
    const data = await API.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName })
    });

    API.token = data.token;
    location.href = '/profile.html';
  } catch (error) {
    message.textContent = error.message;
  }
}
