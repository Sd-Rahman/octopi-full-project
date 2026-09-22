import dotenv from 'dotenv';
dotenv.config();

import connectDB from './config/db.js';
import app from './app.js';
import { startSubscriptionReminderJob } from './jobs/subscriptionReminder.js';

connectDB();

// Start background jobs after DB connection
startSubscriptionReminderJob();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
