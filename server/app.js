const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDatabase } = require('./db');

const authRoutes = require('./routes/auth.routes');
const meRoutes = require('./routes/me.routes');
const pointsRoutes = require('./routes/points.routes');
const membersRoutes = require('./routes/members.routes');
const quotesRoutes = require('./routes/quotes.routes');
const guestbookRoutes = require('./routes/guestbook.routes');
const randomRoutes = require('./routes/random.routes');
const adminRoutes = require('./routes/admin.routes');
const checkinRoutes = require('./routes/checkin.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const shopRoutes = require('./routes/shop.routes');
const postsRoutes = require('./routes/posts.routes');
const feedRoutes = require('./routes/feed.routes');
const achievementsRoutes = require('./routes/achievements.routes');
const casinoRoutes = require('./routes/casino.routes');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/guestbook', guestbookRoutes);
app.use('/api/random', randomRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/casino', casinoRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: '찾을 수 없는 경로입니다.' });
});

async function start() {
  await initDatabase();

  return new Promise((resolve) => {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`Madmen Hub running on port ${port}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to initialize database', error);
    process.exit(1);
  });
}

module.exports = {
  app,
  start
};
