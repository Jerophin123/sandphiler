'use strict';

const fs = require('fs');
const mysql = require('mysql2/promise');

const MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
const MYSQL_PORT = parseInt(process.env.MYSQL_PORT || '3306', 10);
const MYSQL_USER = process.env.MYSQL_USER || 'sql_sandbox';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '1168mysql';

// Read main file argument from command line
const mainFile = process.argv[2];
if (!mainFile || !fs.existsSync(mainFile)) {
  console.error('ERROR: SQL source file not found or not specified.');
  process.exit(1);
}

// 1. Prohibited Administrative SQL Commands Security Checker
function checkSecurity(sqlText) {
  const blockedKeywords = [
    'create\\s+user',
    'drop\\s+user',
    'grant',
    'revoke',
    'shutdown',
    'file',
    'super',
    'process',
    'flush',
    'load\\s+data',
    'outfile',
    'infile'
  ];
  
  const regex = new RegExp(`\\b(${blockedKeywords.join('|')})\\b`, 'i');
  const match = sqlText.match(regex);
  if (match) {
    return {
      safe: false,
      reason: `Security Restriction: Administrative keyword '${match[1].toUpperCase()}' is strictly prohibited in the SQL sandbox.`
    };
  }
  return { safe: true };
}

// 2. Terminal-like ASCII Table Formatter for SELECT results
function formatTable(rows, fields) {
  if (!rows || rows.length === 0) {
    return 'Empty set (0 rows)';
  }
  
  const headers = fields.map(f => f.name);
  const columnWidths = {};
  
  // Initialize widths with header lengths
  headers.forEach(h => {
    columnWidths[h] = h.length;
  });
  
  // Calculate max width for each column dynamically
  rows.forEach(row => {
    headers.forEach(h => {
      const val = row[h] === null ? 'NULL' : String(row[h]);
      if (val.length > columnWidths[h]) {
        columnWidths[h] = val.length;
      }
    });
  });
  
  // Build boundary separator line (e.g. +----+------+ )
  const border = '+' + headers.map(h => '-'.repeat(columnWidths[h] + 2)).join('+') + '+';
  
  const lines = [border];
  
  // Header row
  const headerRow = '|' + headers.map(h => ' ' + h.padEnd(columnWidths[h]) + ' ').join('|') + '|';
  lines.push(headerRow);
  lines.push(border);
  
  // Data rows
  rows.forEach(row => {
    const dataRow = '|' + headers.map(h => {
      const val = row[h] === null ? 'NULL' : String(row[h]);
      return ' ' + val.padEnd(columnWidths[h]) + ' ';
    }).join('|') + '|';
    lines.push(dataRow);
  });
  
  lines.push(border);
  
  const rowCountLabel = rows.length === 1 ? '1 row in set' : `${rows.length} rows in set`;
  lines.push(`${rowCountLabel}\n`);
  
  return lines.join('\n');
}

async function main() {
  const sqlText = fs.readFileSync(mainFile, 'utf8');
  
  // 1. Run security check
  const safety = checkSecurity(sqlText);
  if (!safety.safe) {
    console.error(safety.reason);
    process.exit(1);
  }
  
  // 2. Split statements by semicolon (removing comments)
  const cleanedSql = sqlText
    .replace(/--.*$/gm, '') // Remove single line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments
    
  const queries = cleanedSql
    .split(';')
    .map(q => q.trim())
    .filter(q => q.length > 0);
    
  if (queries.length === 0) {
    console.log('No valid SQL statements found.');
    return;
  }
  
  // 3. Generate unique isolated DB name
  const sessionUuid = 'sandbox_sql_' + Math.random().toString(36).substring(2, 8);
  
  let connection = null;
  let hasCreatedDb = false;
  
  try {
    // Connect to the local MySQL server root/admin interface
    connection = await mysql.createConnection({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD
    });
    
    // Create temporary isolated database
    await connection.query(`CREATE DATABASE ${sessionUuid};`);
    hasCreatedDb = true;
    
    // Switch connection directly into the new isolated database
    await connection.query(`USE ${sessionUuid};`);
    
    // Execute user queries in sequence
    for (const query of queries) {
      const [result, fields] = await connection.query(query);
      
      if (fields) {
        // Tabular result (SELECT, SHOW, DESCRIBE)
        console.log(formatTable(result, fields));
      } else {
        // Command execution result (INSERT, UPDATE, CREATE TABLE)
        const affected = result.affectedRows !== undefined ? result.affectedRows : 0;
        const affectedLabel = affected === 1 ? '1 row affected' : `${affected} rows affected`;
        console.log(`Query OK, ${affectedLabel}\n`);
      }
    }
    
  } catch (err) {
    // Format error block to match official standard mysql terminal styling
    let errorMsg = `ERROR ${err.errno || 'SQL'}: ${err.sqlMessage || err.message}`;
    console.error(errorMsg);
    process.exit(1);
    
  } finally {
    // 4. Guaranteed Auto-Cleanup Drop Database sweep
    if (connection) {
      try {
        if (hasCreatedDb) {
          // Drop the temporary session database
          await connection.query(`DROP DATABASE ${sessionUuid};`);
        }
      } catch (cleanupErr) {
        console.error('Failed to cleanup temp database:', cleanupErr.message);
      } finally {
        await connection.end();
      }
    }
  }
}

main();
