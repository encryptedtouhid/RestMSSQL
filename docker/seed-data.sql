USE mssqlrest_test;
GO

-- ============================================================
-- dbo data
-- ============================================================
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

INSERT INTO dbo.Tags (Name) VALUES
  ('bestseller'), ('new-arrival'), ('sale'), ('premium'), ('eco-friendly'),
  ('limited-edition'), ('gift-idea'), ('trending');
GO

INSERT INTO dbo.ProductTags (ProductId, TagId) VALUES
  (1, 1), (1, 4), (1, 8),     -- Laptop: bestseller, premium, trending
  (2, 1), (2, 2), (2, 8),     -- Smartphone: bestseller, new-arrival, trending
  (3, 3), (3, 7),             -- Headphones: sale, gift-idea
  (5, 2),                      -- TypeScript Handbook: new-arrival
  (8, 3), (8, 5),             -- T-Shirt: sale, eco-friendly
  (10, 4), (10, 6),           -- Sneakers: premium, limited-edition
  (11, 5),                     -- Coffee Beans: eco-friendly
  (13, 7), (13, 8),           -- Basketball: gift-idea, trending
  (15, 5);                     -- Yoga Mat: eco-friendly
GO

-- ============================================================
-- AllDataTypes — exercise every SQL Server type
-- ============================================================
INSERT INTO dbo.AllDataTypes (
  ColTinyInt, ColSmallInt, ColInt, ColBigInt,
  ColDecimal, ColNumeric, ColMoney, ColSmallMoney,
  ColFloat, ColReal, ColBit,
  ColChar, ColNChar,
  ColVarchar, ColNVarchar, ColVarcharMax, ColNVarcharMax,
  ColText, ColNText,
  ColDate, ColTime, ColSmallDateTime, ColDateTime, ColDateTime2, ColDateTimeOffset,
  ColBinary, ColVarbinary, ColVarbinaryMax,
  ColXml
) VALUES
  -- Row 1: typical values
  (
    255, 32767, 2147483647, 9223372036854775807,
    12345.6789, 99999.99, 922337203685477.5807, 214748.3647,
    3.14159265358979, 2.71828,
    1,
    'ABCDEFGHIJ', N'Unicode   ',
    'Hello World', N'Hello World Unicode', 'Long text content here...', N'Long unicode text...',
    'Legacy text', N'Legacy ntext',
    '2024-01-15', '14:30:00', '2024-01-15 14:30:00', '2024-01-15 14:30:00.000',
    '2024-01-15 14:30:00.1234567', '2024-01-15 14:30:00.1234567 +05:30',
    0x0102030405060708090A0B0C0D0E0F10, 0xDEADBEEF, 0xCAFEBABE,
    '<root><item key="a">value1</item></root>'
  ),
  -- Row 2: minimum/edge values
  (
    0, -32768, -2147483648, -9223372036854775808,
    -99999.9999, -99999.99, -922337203685477.5808, -214748.3648,
    -1.79E+308, -3.40E+38,
    0,
    '          ', N'          ',
    '', N'', '', N'',
    '', N'',
    '0001-01-01', '00:00:00', '1900-01-01 00:00:00', '1753-01-01 00:00:00.000',
    '0001-01-01 00:00:00.0000000', '0001-01-01 00:00:00.0000000 +00:00',
    0x00000000000000000000000000000000, 0x00, 0x00,
    '<empty/>'
  ),
  -- Row 3: all NULLs (except Id)
  (
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL,
    NULL, NULL, NULL, NULL,
    NULL, NULL,
    NULL, NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL,
    NULL
  ),
  -- Row 4: more typical data
  (
    128, 1000, 50000, 123456789012345,
    1234.5678, 5678.90, 100.50, 50.25,
    0.0, 0.0,
    1,
    'Test      ', N'Test      ',
    'Sample varchar', N'Sample nvarchar with unicode: ', 'A much longer piece of text that goes on and on...', N'Unicode long text with special chars...',
    'Some text content', N'Some ntext content',
    '2025-12-31', '23:59:59.9999999', '2025-06-15 12:00:00', '2025-06-15 12:00:00.997',
    '2025-06-15 12:00:00.1234567', '2025-06-15T12:00:00.1234567-08:00',
    0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF, 0xABCDEF0123456789, 0x0123456789ABCDEF,
    '<data><nested><deep>value</deep></nested></data>'
  );
GO

-- ============================================================
-- sales data
-- ============================================================
INSERT INTO sales.Customers (FirstName, LastName, Email, Phone) VALUES
  ('Alice', 'Johnson', 'alice@example.com', '+1-555-0101'),
  ('Bob', 'Smith', 'bob@example.com', '+1-555-0102'),
  ('Charlie', 'Brown', 'charlie@example.com', '+1-555-0103'),
  ('Diana', 'Prince', 'diana@example.com', '+1-555-0104'),
  ('Eve', 'Wilson', 'eve@example.com', NULL),
  ('Frank', 'Castle', NULL, '+1-555-0106'),
  ('Grace', 'Hopper', 'grace@example.com', '+1-555-0107');
GO

INSERT INTO sales.Orders (CustomerId, TotalAmount, Status, ShippedDate) VALUES
  (1, 1149.98, 'shipped', '2024-01-20'),
  (2, 89.98, 'delivered', '2024-01-18'),
  (3, 149.99, 'pending', NULL),
  (4, 59.98, 'shipped', '2024-02-01'),
  (5, 199.97, 'cancelled', NULL),
  (1, 49.99, 'pending', NULL),
  (6, 999.99, 'delivered', '2024-01-25'),
  (7, 174.97, 'shipped', '2024-02-10');
GO

INSERT INTO sales.OrderItems (OrderId, ProductId, Quantity, UnitPrice, Discount) VALUES
  (1, 1, 1, 999.99, 0),
  (1, 3, 1, 149.99, 0),
  (2, 5, 1, 39.99, 5.00),
  (2, 6, 1, 49.99, 0),
  (3, 3, 1, 149.99, 10.00),
  (4, 11, 2, 14.99, 0),
  (4, 12, 2, 8.99, 0),
  (5, 8, 3, 19.99, 0),
  (5, 13, 1, 29.99, 0),
  (5, 15, 1, 24.99, 0),
  (6, 6, 1, 49.99, 0),
  (7, 1, 1, 999.99, 50.00),
  (8, 8, 2, 19.99, 0),
  (8, 9, 1, 59.99, 0),
  (8, 15, 1, 24.99, 0);
GO

-- ============================================================
-- hr data
-- ============================================================
INSERT INTO hr.Departments (Name, Budget) VALUES
  ('Engineering', 500000.00),
  ('Marketing', 200000.00),
  ('Sales', 300000.00),
  ('HR', 150000.00),
  ('Finance', 250000.00);
GO

INSERT INTO hr.Employees (FirstName, LastName, ManagerId, DepartmentId, HireDate, TerminationDate, Salary, IsActive) VALUES
  ('John', 'CEO', NULL, 1, '2020-01-15', NULL, 150000.00, 1),
  ('Jane', 'VP', 1, 1, '2020-06-01', NULL, 120000.00, 1),
  ('Mike', 'Manager', 2, 1, '2021-03-15', NULL, 95000.00, 1),
  ('Sara', 'Developer', 3, 1, '2022-01-10', NULL, 85000.00, 1),
  ('Tom', 'Developer', 3, 1, '2022-06-20', NULL, 82000.00, 1),
  ('Lisa', 'Designer', 2, 2, '2021-09-01', NULL, 88000.00, 1),
  ('Dave', 'SalesRep', 1, 3, '2023-01-01', NULL, 70000.00, 1),
  ('Amy', 'HRManager', 1, 4, '2021-01-01', NULL, 90000.00, 1),
  ('Bob', 'Intern', 3, 1, '2023-06-01', '2023-12-31', 40000.00, 0),
  ('Carol', 'Accountant', 1, 5, '2022-03-15', NULL, 78000.00, 1);
GO

INSERT INTO hr.PerformanceReviews (EmployeeId, ReviewerId, ReviewDate, Rating, Comments) VALUES
  (4, 3, '2023-06-15', 5, 'Excellent performance, exceeds expectations'),
  (5, 3, '2023-06-15', 4, 'Good work, meets expectations'),
  (6, 2, '2023-07-01', 4, 'Creative and reliable'),
  (3, 2, '2023-07-01', 5, 'Strong leadership skills'),
  (7, 1, '2023-08-01', 3, 'Meeting targets but needs improvement in communication'),
  (9, 3, '2023-09-01', 2, 'Needs more guidance and training'),
  (4, 3, '2024-06-15', 5, 'Consistently outstanding contributor'),
  (10, 1, '2024-01-15', 4, 'Accurate and thorough');
GO

-- ============================================================
-- inventory data
-- ============================================================
INSERT INTO inventory.Warehouses (Name, Location, Capacity) VALUES
  ('Main Warehouse', 'New York, NY', 10000),
  ('West Coast Hub', 'Los Angeles, CA', 8000),
  ('Central Storage', 'Chicago, IL', 6000),
  ('Distribution Center', 'Dallas, TX', 5000);
GO

INSERT INTO inventory.StockLevels (WarehouseId, ProductId, Quantity, LastRestocked) VALUES
  (1, 1, 50, '2024-01-10'),
  (1, 2, 100, '2024-01-10'),
  (1, 3, 200, '2024-01-10'),
  (1, 5, 75, '2024-01-05'),
  (2, 1, 30, '2024-01-12'),
  (2, 8, 500, '2024-01-08'),
  (2, 10, 150, '2024-01-08'),
  (3, 11, 300, '2024-01-15'),
  (3, 12, 200, '2024-01-15'),
  (3, 13, 100, '2024-01-15'),
  (4, 1, 20, '2024-01-20'),
  (4, 2, 40, '2024-01-20'),
  (4, 14, 60, '2024-01-18'),
  (4, 15, 80, '2024-01-18');
GO

INSERT INTO inventory.Transfers (FromWarehouseId, ToWarehouseId, ProductId, Quantity, Status) VALUES
  (1, 2, 1, 10, 'completed'),
  (1, 3, 11, 50, 'completed'),
  (2, 4, 8, 100, 'in-transit'),
  (3, 1, 13, 25, 'pending'),
  (1, NULL, 2, 200, 'completed'),   -- incoming shipment (no source warehouse)
  (4, 2, 14, 20, 'pending');
GO

-- ============================================================
-- finance data
-- ============================================================
INSERT INTO finance.Accounts (AccountNumber, AccountName, Balance, Currency) VALUES
  ('ACC-001', 'Operating Account', 1500000.00, 'USD'),
  ('ACC-002', 'Payroll Account', 350000.00, 'USD'),
  ('ACC-003', 'Marketing Budget', 75000.00, 'USD'),
  ('ACC-004', 'European Operations', 250000.00, 'EUR'),
  ('ACC-005', 'Savings Reserve', 2000000.00, 'USD');
GO

INSERT INTO finance.Transactions (AccountId, Amount, TransactionType, Description) VALUES
  (1, 50000.00, 'credit', 'Monthly revenue deposit'),
  (1, 12000.00, 'debit', 'Office lease payment'),
  (2, 85000.00, 'debit', 'January payroll'),
  (2, 350000.00, 'credit', 'Payroll funding transfer'),
  (3, 5000.00, 'debit', 'Social media campaign'),
  (3, 15000.00, 'debit', 'Print advertising'),
  (4, 25000.00, 'credit', 'EU client payment'),
  (4, 8000.00, 'debit', 'EU office supplies'),
  (5, 100000.00, 'credit', 'Quarterly savings deposit'),
  (1, 75000.00, 'credit', 'Product sales batch');
GO

-- ============================================================
-- content data (GUID-based PKs)
-- ============================================================
DECLARE @author1 UNIQUEIDENTIFIER = 'A1111111-1111-1111-1111-111111111111';
DECLARE @author2 UNIQUEIDENTIFIER = 'A2222222-2222-2222-2222-222222222222';
DECLARE @author3 UNIQUEIDENTIFIER = 'A3333333-3333-3333-3333-333333333333';

INSERT INTO content.Authors (Id, Name, Bio, Website) VALUES
  (@author1, 'Jane Doe', 'Senior tech writer with 10 years of experience', 'https://janedoe.example.com'),
  (@author2, 'John Writer', 'Freelance journalist covering technology', NULL),
  (@author3, 'Alice Blogger', NULL, 'https://aliceblogger.example.com');

DECLARE @article1 UNIQUEIDENTIFIER = 'B1111111-1111-1111-1111-111111111111';
DECLARE @article2 UNIQUEIDENTIFIER = 'B2222222-2222-2222-2222-222222222222';
DECLARE @article3 UNIQUEIDENTIFIER = 'B3333333-3333-3333-3333-333333333333';
DECLARE @article4 UNIQUEIDENTIFIER = 'B4444444-4444-4444-4444-444444444444';

INSERT INTO content.Articles (Id, AuthorId, Title, Body, Metadata, PublishedAt, IsPublished, ViewCount) VALUES
  (@article1, @author1, 'Getting Started with SQL Server', 'A comprehensive guide to SQL Server...', '<meta><tags>sql,database</tags><category>tutorial</category></meta>', '2024-01-10', 1, 1523),
  (@article2, @author1, 'OData Best Practices', 'Learn how to design OData APIs...', '<meta><tags>odata,api</tags><category>guide</category></meta>', '2024-02-15', 1, 892),
  (@article3, @author2, 'The Future of REST APIs', 'REST APIs continue to evolve...', NULL, NULL, 0, 0),
  (@article4, @author3, 'Docker for Beginners', 'Docker simplifies deployment...', '<meta><tags>docker,devops</tags><category>tutorial</category></meta>', '2024-03-01', 1, 2341);

INSERT INTO content.Comments (ArticleId, ParentCommentId, AuthorName, Body) VALUES
  (@article1, NULL, 'Reader1', 'Great article, very helpful!'),
  (@article1, NULL, 'Reader2', 'Could you cover more advanced topics?'),
  (@article1, 1, 'Jane Doe', 'Thanks! Advanced topics coming soon.'),
  (@article1, 2, 'Reader1', 'Looking forward to it!'),
  (@article2, NULL, 'DevUser', 'Exactly what I needed for my project'),
  (@article4, NULL, 'NewDev', 'Perfect intro to Docker'),
  (@article4, 6, 'Alice Blogger', 'Glad it helped!');
GO
