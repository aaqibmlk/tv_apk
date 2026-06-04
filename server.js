const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const tvSessions = new Map();

const CLIENT_ID = "11278554359-hiev4f8q0sc81cpkalm8bg4rubucovms.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "https://tv-apk.onrender.com/api/tv/callback";
const PORT = process.env.PORT || 3007;

app.get('/api/tv/get-code', (req, res) => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    tvSessions.set(code, { token: null, status: 'pending', createdAt: Date.now() });
    
    setTimeout(() => tvSessions.delete(code), 10 * 60 * 1000);
    
    res.json({ success: true, code: code });
});

app.get('/tv-login', (req, res) => {
    res.send(`
        <div style="font-family: Arial; text-align: center; margin-top: 100px;">
            <h2>Android TV - Google Drive Login</h2>
            <form action="/api/tv/verify-code" method="POST">
                <input type="text" name="code" placeholder="Enter 4-Digit TV Code" required style="padding:10px; font-size:16px;"><br><br>
                <button type="submit" style="padding:10px 20px; font-size:16px; background:#4CAF50; color:white; border:none; cursor:pointer;">Next</button>
            </form>
        </div>
    `);
});

app.post('/api/tv/verify-code', (req, res) => {
    const { code } = req.body;
    if (!tvSessions.has(code)) {
        return res.send("<h3>Invalid or Expired Code! Please check your TV screen.</h3>");
    }
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=https://www.googleapis.com/auth/drive.readonly&access_type=offline&prompt=consent&state=${code}`;
    res.redirect(googleAuthUrl);
});

app.get('/api/tv/callback', async (req, res) => {
    const { code, state } = req.query;
    
    try {
        const response = await axios.post('https://oauth2.googleapis.com/token', {
            code: code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code'
        });

        const refreshToken = response.data.refresh_token;

        if (tvSessions.has(state)) {
            tvSessions.set(state, { token: refreshToken, status: 'approved' });
            res.send("<h3>Login Successful! You can close this tab. Your TV will update automatically.</h3>");
        } else {
            res.send("<h3>Session Expired!</h3>");
        }
    } catch (error) {
        console.error(error);
        res.send("<h3>Authentication Failed!</h3>");
    }
});

app.get('/api/tv/check-status/:code', (req, res) => {
    const { code } = req.params;
    if (!tvSessions.has(code)) {
        return res.json({ status: 'expired' });
    }
    
    const session = tvSessions.get(code);
    if (session.status === 'approved') {
        res.json({ status: 'approved', refresh_token: session.token });
        tvSessions.delete(code);
    } else {
        res.json({ status: 'pending' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
