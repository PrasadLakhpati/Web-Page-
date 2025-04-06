const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');

// Get all books
router.get('/', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT * FROM BOOKS ORDER BY BOOK_ID`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        res.render('books/index', { books: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching books');
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

// Show add book form
router.get('/add', (req, res) => {
    res.render('books/add');
});

// Add new book
router.post('/', async (req, res) => {
    let connection;
    try {
        const { title, author, isbn, published_year, category } = req.body;
        connection = await oracledb.getConnection();
        
        await connection.execute(
            `INSERT INTO BOOKS (TITLE, AUTHOR, ISBN, PUBLISHED_YEAR, CATEGORY) 
             VALUES (:1, :2, :3, :4, :5)`,
            [title, author, isbn, published_year, category]
        );
        
        await connection.commit();
        res.redirect('/books');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding book');
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

// Get book details
router.get('/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT * FROM BOOKS WHERE BOOK_ID = :1`,
            [req.params.id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        if (result.rows.length === 0) {
            res.status(404).send('Book not found');
            return;
        }
        
        res.render('books/details', { book: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching book details');
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

// Show edit book form
router.get('/:id/edit', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT * FROM BOOKS WHERE BOOK_ID = :1`,
            [req.params.id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        if (result.rows.length === 0) {
            res.status(404).send('Book not found');
            return;
        }
        
        res.render('books/edit', { book: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching book');
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

// Update book
router.post('/:id', async (req, res) => {
    let connection;
    try {
        const { title, author, isbn, published_year, category, status } = req.body;
        connection = await oracledb.getConnection();
        
        await connection.execute(
            `UPDATE BOOKS 
             SET TITLE = :1, AUTHOR = :2, ISBN = :3, PUBLISHED_YEAR = :4, 
                 CATEGORY = :5, STATUS = :6
             WHERE BOOK_ID = :7`,
            [title, author, isbn, published_year, category, status, req.params.id]
        );
        
        await connection.commit();
        res.redirect(`/books/${req.params.id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating book');
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

// Delete book
router.post('/:id/delete', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        await connection.execute(
            `DELETE FROM BOOKS WHERE BOOK_ID = :1`,
            [req.params.id]
        );
        
        await connection.commit();
        res.redirect('/books');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting book');
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