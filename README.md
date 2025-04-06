# Library Management System

A simple library management system built with Node.js, Express, and Oracle Database.

## Features

- Book Management (Add, Edit, Delete, View)
- Member Management (Add, Edit, Delete, View)
- Loan Management (Create Loans, Return Books, View History)
- Dashboard with Statistics
- Oracle Database Integration

## Prerequisites

- Node.js (v14 or higher)
- Oracle Database (XE or higher)
- Oracle Instant Client

## Setup

1. Install Oracle Instant Client and add it to your system PATH
2. Clone the repository
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file in the root directory with your database credentials:
   ```
   PORT=3000
   DB_USER=your_oracle_username
   DB_PASSWORD=your_oracle_password
   DB_CONNECTION_STRING=localhost:1521/XE
   ```
5. Start the application:
   ```bash
   npm start
   ```
   For development with auto-reload:
   ```bash
   npm run dev
   ```

## Database Schema

The application uses the following tables:

### Books
- BOOK_ID (Primary Key)
- TITLE
- AUTHOR
- ISBN
- PUBLISHED_YEAR
- CATEGORY
- STATUS
- CREATED_AT

### Members
- MEMBER_ID (Primary Key)
- NAME
- EMAIL
- PHONE
- JOIN_DATE

### Loans
- LOAN_ID (Primary Key)
- BOOK_ID (Foreign Key)
- MEMBER_ID (Foreign Key)
- LOAN_DATE
- DUE_DATE
- RETURN_DATE
- STATUS

## Usage

1. Access the application at `http://localhost:3000`
2. Use the navigation menu to access different sections:
   - Books: Manage your book inventory
   - Members: Manage library members
   - Loans: Handle book loans and returns

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License. 