DROP TABLE IF EXISTS cust_hist; 
CREATE TABLE cust_hist (customerid integer, orderid integer);
INSERT INTO cust_hist VALUES (883, 3);
INSERT INTO cust_hist VALUES (882, 33);
INSERT INTO cust_hist VALUES (882, 331);

DROP TABLE IF EXISTS customers; 
CREATE TABLE customers (state text, customerid integer);
INSERT INTO customers VALUES ('VA', 882);
INSERT INTO customers VALUES ('MD', 883);
INSERT INTO customers VALUES ('CA', 131);
INSERT INTO customers VALUES ('MA', 431);

DROP TABLE IF EXISTS orders; 
CREATE TABLE orders ( netamount numeric ,  totalamount numeric, orderid integer);
INSERT INTO orders VALUES (13.2, 33.2, 3);
INSERT INTO orders VALUES (11.37, 112.3, 33);
INSERT INTO orders VALUES (42.4, 119.2, 331);
INSERT INTO orders VALUES (105.28, 31);

DROP TABLE IF EXISTS orderlines; 
CREATE TABLE orderlines ( prod_id integer, orderid integer);
INSERT INTO orderlines VALUES (44, 3);
INSERT INTO orderlines VALUES (22, 33);
INSERT INTO orderlines VALUES (99, 331);
INSERT INTO orderlines VALUES (44, 31);

DROP TABLE IF EXISTS products; 
CREATE TABLE products ( prod_id integer, category integer);
INSERT INTO products VALUES (44, 93);
INSERT INTO products VALUES (22, 23);
INSERT INTO products VALUES (99, 23);
INSERT INTO products VALUES (44, 93);

DROP TABLE IF EXISTS categories; 
CREATE TABLE categories ( categoryname text, category integer);
INSERT INTO categories VALUES ('pet rock', 93);
INSERT INTO categories VALUES ('headphones', 23);
INSERT INTO categories VALUES ('chewing gum', 25);


EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) SELECT c.state,
  cat.categoryname,
  sum(o.netamount),
  sum(o.totalamount)
FROM customers c
  INNER JOIN cust_hist ch ON c.customerid = ch.customerid
  INNER JOIN orders o ON ch.orderid = o.orderid
  INNER JOIN orderlines ol ON ol.orderid = o.orderid
  INNER JOIN products p ON ol.prod_id = p.prod_id
  INNER JOIN categories cat ON p.category = cat.category
GROUP BY c.state, cat.categoryname
ORDER BY c.state, sum(o.totalamount) DESC
LIMIT 10 OFFSET 1