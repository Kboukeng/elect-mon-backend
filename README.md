# Election Monitoring Backend

This project is an Election Monitoring System for Cameroon, designed to facilitate the reporting and management of incidents during elections. It leverages modern technologies such as Express.js, Supabase, and Twilio to provide a robust backend solution.

## Features

- **Incident Reporting**: Users can report incidents via SMS, which are then stored in the database.
- **User Management**: Includes functionalities for user registration, login, and role-based access control.
- **Real-time Notifications**: Sends SMS notifications to users upon successful report submission.
- **Secure Authentication**: Utilizes JWT for secure user authentication.
- **Data Management**: CRUD operations for managing voting stations, staff, voters, reports, and results.

## Technologies Used

- **Node.js**: JavaScript runtime for building the backend.
- **Express.js**: Web framework for building APIs.
- **Supabase**: Backend-as-a-Service for database management.
- **Twilio**: SMS service for sending notifications.
- **JWT**: For secure user authentication.

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/election-monitoring-backend.git
   ```

2. Navigate to the project directory:
   ```
   cd election-monitoring-backend
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Create a `.env` file in the root directory and add your environment variables:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   ```

## Usage

1. Start the server:
   ```
   npm start
   ```

2. The API will be available at `http://localhost:3000`.

## API Endpoints

- **Incident Reporting**
  - `POST /api/incidents/report`: Submit an incident report via SMS.
  - `GET /api/incidents`: Retrieve all incident reports.

- **User Management**
  - `POST /api/users/register`: Register a new user.
  - `POST /api/users/login`: Log in an existing user.
  - `GET /api/users`: List all users.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.