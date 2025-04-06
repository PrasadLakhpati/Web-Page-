const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');

// Get all members
router.get('/', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT * FROM MEMBERS ORDER BY MEMBER_ID`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        res.render('members/index', { members: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching members');
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

// Show add member form
router.get('/add', (req, res) => {
    res.render('members/add');
});

// Add new member
router.post('/', async (req, res) => {
    let connection;
    try {
        const { name, email, phone } = req.body;
        connection = await oracledb.getConnection();
        
        await connection.execute(
            `INSERT INTO MEMBERS (NAME, EMAIL, PHONE) 
             VALUES (:1, :2, :3)`,
            [name, email, phone]
        );
        
        await connection.commit();
        res.redirect('/members');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding member');
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

// Get member details
router.get('/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT m.*, 
                    (SELECT COUNT(*) FROM LOANS l 
                     WHERE l.MEMBER_ID = m.MEMBER_ID AND l.STATUS = 'BORROWED') as ACTIVE_LOANS
             FROM MEMBERS m 
             WHERE m.MEMBER_ID = :1`,
            [req.params.id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        if (result.rows.length === 0) {
            res.status(404).send('Member not found');
            return;
        }
        
        // Get loan history
        const loanHistory = await connection.execute(
            `SELECT l.*, b.TITLE as BOOK_TITLE
             FROM LOANS l
             JOIN BOOKS b ON l.BOOK_ID = b.BOOK_ID
             WHERE l.MEMBER_ID = :1
             ORDER BY l.LOAN_DATE DESC`,
            [req.params.id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        res.render('members/details', { 
            member: result.rows[0],
            loanHistory: loanHistory.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching member details');
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

// Show edit member form
router.get('/:id/edit', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(
            `SELECT * FROM MEMBERS WHERE MEMBER_ID = :1`,
            [req.params.id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        if (result.rows.length === 0) {
            res.status(404).send('Member not found');
            return;
        }
        
        res.render('members/edit', { member: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching member');
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

// Update member
router.post('/:id', async (req, res) => {
    let connection;
    try {
        const { name, email, phone } = req.body;
        connection = await oracledb.getConnection();
        
        await connection.execute(
            `UPDATE MEMBERS 
             SET NAME = :1, EMAIL = :2, PHONE = :3
             WHERE MEMBER_ID = :4`,
            [name, email, phone, req.params.id]
        );
        
        await connection.commit();
        res.redirect(`/members/${req.params.id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating member');
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

// Delete member
router.post('/:id/delete', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        
        // Check for active loans
        const activeLoans = await connection.execute(
            `SELECT COUNT(*) as COUNT FROM LOANS 
             WHERE MEMBER_ID = :1 AND STATUS = 'BORROWED'`,
            [req.params.id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        if (activeLoans.rows[0].COUNT > 0) {
            res.status(400).send('Cannot delete member with active loans');
            return;
        }
        
        await connection.execute(
            `DELETE FROM MEMBERS WHERE MEMBER_ID = :1`,
            [req.params.id]
        );
        
        await connection.commit();
        res.redirect('/members');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting member');
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