export function seedDemo(db) {
  db.run(`PRAGMA foreign_keys=ON;
    CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT);
    CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, company TEXT, country TEXT, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','pending')), lifetime_value REAL NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE addresses (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id), street TEXT, city TEXT, country TEXT, postal_code TEXT);
    CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, category_id INTEGER REFERENCES categories(id), price REAL NOT NULL, stock INTEGER DEFAULT 0);
    CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id), status TEXT DEFAULT 'completed', total REAL NOT NULL, placed_at TEXT NOT NULL);
    CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), product_id INTEGER NOT NULL REFERENCES products(id), quantity INTEGER NOT NULL, unit_price REAL NOT NULL);
    CREATE TABLE payments (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), method TEXT, amount REAL, paid_at TEXT);
    CREATE INDEX idx_orders_customer ON orders(customer_id);
    CREATE INDEX idx_customers_country ON customers(country);
    CREATE VIEW customer_summary AS SELECT c.id,c.name,c.country,COUNT(o.id) AS order_count,ROUND(COALESCE(SUM(o.total),0),2) AS total_spent FROM customers c LEFT JOIN orders o ON o.customer_id=c.id GROUP BY c.id;
    CREATE VIEW monthly_revenue AS SELECT substr(placed_at,1,7) AS month,COUNT(*) AS orders,ROUND(SUM(total),2) AS revenue FROM orders GROUP BY month;
    BEGIN;`);
  const names = [
    "Olivia Rhye",
    "Phoenix Baker",
    "Lana Steiner",
    "Demi Wilkinson",
    "Drew Cano",
    "Natali Craig",
    "Orlando Diggs",
    "Andi Lane",
    "Kate Morrison",
    "Koray Okumus",
    "Alex Morgan",
    "Sophie Moore",
    "James Wilson",
    "Emma Davis",
    "Noah Martinez",
    "Isabella Garcia",
  ];
  const countries = [
    "United States",
    "Germany",
    "United Kingdom",
    "Canada",
    "Australia",
    "France",
    "Netherlands",
    "Sweden",
  ];
  const companies = [
    "Layers",
    "Sisyphus",
    "Catalog",
    "Circooles",
    "Hourglass",
    "Command+R",
    "Capsule",
    "Quotient",
  ];
  const cat = db.prepare("INSERT INTO categories VALUES (?,?,?)");
  ["Furniture", "Lighting", "Accessories", "Textiles", "Workspace"].forEach(
    (n, i) =>
      cat.run([i + 1, n, `Thoughtful ${n.toLowerCase()} for everyday spaces.`]),
  );
  cat.free();
  const prod = db.prepare("INSERT INTO products VALUES (?,?,?,?,?)");
  const products = [
    "Arc lounge chair",
    "Column table lamp",
    "Studio desk",
    "Linen throw",
    "Oak side table",
    "Ceramic vase",
    "Woven rug",
    "Task chair",
    "Pendant light",
    "Desk organizer",
    "Modular shelf",
    "Cotton cushion",
  ];
  products.forEach((n, i) =>
    prod.run([i + 1, n, (i % 5) + 1, 39 + i * 27, 20 + i * 3]),
  );
  prod.free();
  const customer = db.prepare("INSERT INTO customers VALUES (?,?,?,?,?,?,?,?)");
  const addr = db.prepare("INSERT INTO addresses VALUES (?,?,?,?,?,?)");
  for (let i = 0; i < 128; i++) {
    const name =
      names[i % names.length] +
      (i >= 16 ? " " + String.fromCharCode(65 + Math.floor(i / 16)) : "");
    customer.run([
      i + 1,
      name,
      name.toLowerCase().replaceAll(" ", ".") +
        "@" +
        ["gmail.com", "layers.design", "outlook.com", "hey.com"][i % 4],
      companies[i % 8],
      countries[i % 8],
      i % 11 === 8 ? "inactive" : i % 13 === 9 ? "pending" : "active",
      Math.round((239 + i * 113.72) * 100) / 100,
      `2025-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
    ]);
    addr.run([
      i + 1,
      i + 1,
      `${i + 12} Market Street`,
      [
        "San Francisco",
        "Berlin",
        "London",
        "Toronto",
        "Melbourne",
        "Paris",
        "Amsterdam",
        "Stockholm",
      ][i % 8],
      countries[i % 8],
      String(10000 + i),
    ]);
  }
  customer.free();
  addr.free();
  const order = db.prepare("INSERT INTO orders VALUES (?,?,?,?,?)"),
    item = db.prepare("INSERT INTO order_items VALUES (?,?,?,?,?)"),
    pay = db.prepare("INSERT INTO payments VALUES (?,?,?,?,?)");
  for (let i = 0; i < 384; i++) {
    const total = 39 + (i % 12) * 27;
    const date = `2026-${String((i % 10) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`;
    order.run([
      i + 1,
      (i % 128) + 1,
      i % 9 === 0 ? "processing" : "completed",
      total,
      date,
    ]);
    item.run([i + 1, i + 1, (i % 12) + 1, 1, total]);
    pay.run([
      i + 1,
      i + 1,
      ["card", "bank_transfer", "paypal"][i % 3],
      total,
      date,
    ]);
  }
  order.free();
  item.free();
  pay.free();
  db.run("COMMIT;");
}
