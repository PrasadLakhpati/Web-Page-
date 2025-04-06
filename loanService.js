const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');

// Get all loans
router.get('/', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT l.*, b.TITLE as BOOK_TITLE, m.NAME as MEMBER_NAME
             FROM LOANS l
             JOIN BOOKS b ON l.BOOK_ID = b.BOOK_ID
             JOIN MEMBERS m ON l.MEMBER_ID = m.MEMBER_ID
             ORDER BY l.LOAN_DATE DESC`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        res.render('loans/index', { loans: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching loans');
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

// Show create loan form
router.get('/create', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        
        // Get available books
        const books = await connection.execute(
            `SELECT * FROM BOOKS WHERE STATUS = 'AVAILABLE' ORDER BY TITLE`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        // Get members
        const members = await connection.execute(
            `SELECT * FROM MEMBERS ORDER BY NAME`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        res.render('loans/create', {
            books: books.rows,
            members: members.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data for loan creation');
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

// Create new loan
router.post('/', async (req, res) => {
    let connection;
    try {
        const { book_id, member_id, due_date } = req.body;
        connection = await oracledb.getConnection();
        
        // Check if book is available
        const bookStatus = await connection.execute(
            `SELECT STATUS FROM BOOKS WHERE BOOK_ID = :1`,
            [book_id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        if (bookStatus.rows[0].STATUS !== 'AVAILABLE') {
            res.status(400).send('Book is not available for loan');
            return;
        }
        
        // Create loan and update book status in a transaction
        await connection.execute(
            `INSERT INTO LOANS (BOOK_ID, MEMBER_ID, DUE_DATE) 
             VALUES (:1, :2, TO_TIMESTAMP(:3, 'YYYY-MM-DD'))`,
            [book_id, member_id, due_date]
        );
        
        await connection.execute(
            `UPDATE BOOKS SET STATUS = 'BORROWED' WHERE BOOK_ID = :1`,
            [book_id]
        );
        
        await connection.commit();
        res.redirect('/loans');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error creating loan');
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

// Return book
router.post('/:id/return', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        
        // Get loan details
        const loan = await connection.execute(
            `SELECT * FROM LOANS WHERE LOAN_ID = :1`,
            [req.params.id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        if (loan.rows.length === 0) {
            res.status(404).send('Loan not found');
            return;
        }
        
        // Update loan and book status
        await connection.execute(
            `UPDATE LOANS 
             SET STATUS = 'RETURNED', RETURN_DATE = CURRENT_TIMESTAMP
             WHERE LOAN_ID = :1`,
            [req.params.id]
        );
        
        await connection.execute(
            `UPDATE BOOKS SET STATUS = 'AVAILABLE' 
             WHERE BOOK_ID = :1`,
            [loan.rows[0].BOOK_ID]
        );
        
        await connection.commit();
        res.redirect('/loans');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error returning book');
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

// Get loan details
router.get('/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT l.*, b.TITLE as BOOK_TITLE, m.NAME as MEMBER_NAME
             FROM LOANS l
             JOIN BOOKS b ON l.BOOK_ID = b.BOOK_ID
             JOIN MEMBERS m ON l.MEMBER_ID = m.MEMBER_ID
             WHERE l.LOAN_ID = :1`,
            [req.params.id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        if (result.rows.length === 0) {
            res.status(404).send('Loan not found');
            return;
        }
        
        res.render('loans/details', { loan: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching loan details');
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

module.exports = router; 