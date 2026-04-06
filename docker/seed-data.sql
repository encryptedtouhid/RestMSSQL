USE mssqlrest_test;
GO

INSERT INTO dbo.Categories (Name, Description) VALUES
  ('Electronics', 'Electronic devices and accessories'),
  ('Books', 'Physical and digital books'),
  ('Clothing', 'Apparel and accessories'),
  ('Food', 'Food and beverages'),
  ('Sports', 'Sports equipment and gear');
GO

INSERT INTO dbo.Products (Name, Price, CategoryId, InStock) VALUES
  ('Laptop', 999.99, 1, 1),
  ('Smartphone', 699.99, 1, 1),
  ('Headphones', 149.99, 1, 1),
  ('USB Cable', 9.99, 1, 0),
  ('TypeScript Handbook', 39.99, 2, 1),
  ('SQL Server Guide', 49.99, 2, 1),
  ('Node.js in Action', 44.99, 2, 0),
  ('T-Shirt', 19.99, 3, 1),
  ('Jeans', 59.99, 3, 1),
  ('Sneakers', 89.99, 3, 1),
  ('Coffee Beans', 14.99, 4, 1),
  ('Green Tea', 8.99, 4, 1),
  ('Basketball', 29.99, 5, 1),
  ('Tennis Racket', 79.99, 5, 1),
  ('Yoga Mat', 24.99, 5, 1);
GO

INSERT INTO sales.Orders (CustomerName, TotalAmount) VALUES
  ('Alice Johnson', 1149.98),
  ('Bob Smith', 89.98),
  ('Charlie Brown', 149.99),
  ('Diana Prince', 59.98),
  ('Eve Wilson', 199.97);
GO

INSERT INTO sales.OrderItems (OrderId, ProductId, Quantity, UnitPrice) VALUES
  (1, 1, 1, 999.99),
  (1, 3, 1, 149.99),
  (2, 5, 1, 39.99),
  (2, 6, 1, 49.99),
  (3, 3, 1, 149.99),
  (4, 11, 2, 14.99),
  (4, 12, 2, 8.99),
  (5, 8, 3, 19.99),
  (5, 13, 1, 29.99),
  (5, 15, 1, 24.99);
GO

INSERT INTO hr.Employees (FirstName, LastName, ManagerId, HireDate, Salary) VALUES
  ('John', 'CEO', NULL, '2020-01-15', 150000.00),
  ('Jane', 'VP', 1, '2020-06-01', 120000.00),
  ('Mike', 'Manager', 2, '2021-03-15', 95000.00),
  ('Sara', 'Developer', 3, '2022-01-10', 85000.00),
  ('Tom', 'Developer', 3, '2022-06-20', 82000.00),
  ('Lisa', 'Designer', 2, '2021-09-01', 88000.00);
GO
