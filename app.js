const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const oracledb = require('oracledb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'library-management-secret',
    resave: false,
    saveUninitialized: true
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/pages'));

// Database connection configuration
const dbConfig = {
    user: process.env.DB_USER || 'your_oracle_username',
    password: process.env.DB_PASSWORD || 'your_oracle_password',
    connectString: process.env.DB_CONNECTION_STRING || 'localhost:1521/XE'
};

// Initialize database pool
async function initialize() {
    try {
        await oracledb.createPool(dbConfig);
        console.log('Connection pool created.');
        
        // Create tables if they don't exist
        await setupDatabase();
    } catch (err) {
        console.error('Error initializing database:', err);
        process.exit(1);
    }
}

// Database setup function
async function setupDatabase() {
    let connection;
    try {
        connection = await oracledb.getConnection();
        
        // Create BOOKS table
        await connection.execute(`
            BEGIN
                EXECUTE IMMEDIATE 'CREATE TABLE BOOKS (
                    BOOK_ID NUMBER PRIMARY KEY,
                    TITLE VARCHAR2(100) NOT NULL,
                    AUTHOR VARCHAR2(100) NOT NULL,
                    ISBN VARCHAR2(20) UNIQUE,
                    PUBLISHED_YEAR NUMBER,
                    CATEGORY VARCHAR2(50),
                    STATUS VARCHAR2(20) DEFAULT ''AVAILABLE'',
                    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )';
            EXCEPTION
                WHEN OTHERS THEN
                    IF SQLCODE != -955 THEN
                        RAISE;
                    END IF;
            END;
        `);
        
        // Create MEMBERS table
        await connection.execute(`
            BEGIN
                EXECUTE IMMEDIATE 'CREATE TABLE MEMBERS (
                    MEMBER_ID NUMBER PRIMARY KEY,
                    NAME VARCHAR2(100) NOT NULL,
                    EMAIL VARCHAR2(100) UNIQUE,
                    PHONE VARCHAR2(20),
                    JOIN_DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )';
            EXCEPTION
                WHEN OTHERS THEN
                    IF SQLCODE != -955 THEN
                        RAISE;
                    END IF;
            END;
        `);
        
        // Create LOANS table
        await connection.execute(`
            BEGIN
                EXECUTE IMMEDIATE 'CREATE TABLE LOANS (
                    LOAN_ID NUMBER PRIMARY KEY,
                    BOOK_ID NUMBER REFERENCES BOOKS(BOOK_ID),
                    MEMBER_ID NUMBER REFERENCES MEMBERS(MEMBER_ID),
                    LOAN_DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    DUE_DATE TIMESTAMP,
                    RETURN_DATE TIMESTAMP,
                    STATUS VARCHAR2(20) DEFAULT ''BORROWED''
                )';
            EXCEPTION
                WHEN OTHERS THEN
                    IF SQLCODE != -955 THEN
                        RAISE;
                    END IF;
            END;
        `);
        
        // Create sequences for auto-incrementing IDs
        const sequences = [
            { name: 'BOOK_ID_SEQ', table: 'BOOKS', column: 'BOOK_ID' },
            { name: 'MEMBER_ID_SEQ', table: 'MEMBERS', column: 'MEMBER_ID' },
            { name: 'LOAN_ID_SEQ', table: 'LOANS', column: 'LOAN_ID' }
        ];
        
        for (const seq of sequences) {
            await connection.execute(`
                BEGIN
                    EXECUTE IMMEDIATE 'CREATE SEQUENCE ${seq.name} START WITH 1 INCREMENT BY 1';
                EXCEPTION
                    WHEN OTHERS THEN
                        IF SQLCODE != -955 THEN
                            RAISE;
                        END IF;
                END;
            `);
            
            // Create or replace trigger
            await connection.execute(`
                BEGIN
                    EXECUTE IMMEDIATE '
                        CREATE OR REPLACE TRIGGER ${seq.table}_BI_TRG
                        BEFORE INSERT ON ${seq.table}
                        FOR EACH ROW
                        BEGIN
                            IF :NEW.${seq.column} IS NULL THEN
                                SELECT ${seq.name}.NEXTVAL INTO :NEW.${seq.column} FROM DUAL;
                            END IF;
                        END;
                    ';
                EXCEPTION
                    WHEN OTHERS THEN
                        IF SQLCODE != -4081 THEN
                            RAISE;
                        END IF;
                END;
            `);
        }
        
        console.log('Database tables and sequences created successfully.');
        
        // Commit the transaction
        await connection.commit();
        
    } catch (err) {
        console.error('Error setting up database:', err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
}

// Routes
// Home page
app.get('/', (req, res) => {
    res.render('index', { title: 'Library Management System' });
});

// Book routes
const bookRoutes = require('./src/services/bookService');
app.use('/books', bookRoutes);

// Member routes
const memberRoutes = require('./src/services/memberService');
app.use('/members', memberRoutes);

// Loan routes
const loanRoutes = require('./src/services/loanService');
app.use('/loans', loanRoutes);

// Start the server
app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    await initialize().catch(console.error);
});

// Handle errors and cleanup on shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    try {
        await oracledb.getPool().close(10);
        console.log('Pool closed');
        process.exit(0);
    } catch(err) {
        console.error('Error closing pool:', err);
        process.exit(1);
    }
});

module.exports = app; 