CREATE DATABASE mssqlrest_test;
GO
USE mssqlrest_test;
GO

-- ============================================================
-- SCHEMAS
-- ============================================================
CREATE SCHEMA sales;
GO
CREATE SCHEMA hr;
GO
CREATE SCHEMA inventory;
GO
CREATE SCHEMA finance;
GO
CREATE SCHEMA content;
GO

-- ============================================================
-- dbo SCHEMA — core tables with common data types
-- ============================================================
CREATE TABLE dbo.Categories (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  Name NVARCHAR(100) NOT NULL,
  Description NVARCHAR(MAX),
  CreatedAt DATETIME2 DEFAULT GETUTCDATE()
);
GO

CREATE TABLE dbo.Products (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  Name NVARCHAR(200) NOT NULL,
  Price DECIMAL(10,2) NOT NULL,
  CategoryId INT NOT NULL FOREIGN KEY REFERENCES dbo.Categories(Id),
  InStock BIT DEFAULT 1,
  CreatedAt DATETIME2 DEFAULT GETUTCDATE()
);
GO

-- Tags table for many-to-many with Products
CREATE TABLE dbo.Tags (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  Name NVARCHAR(50) NOT NULL UNIQUE
);
GO

-- Junction table: many-to-many (Products <-> Tags)
CREATE TABLE dbo.ProductTags (
  ProductId INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(Id),
  TagId INT NOT NULL FOREIGN KEY REFERENCES dbo.Tags(Id),
  PRIMARY KEY (ProductId, TagId)
);
GO

-- ============================================================
-- ALL SQL SERVER DATA TYPES table
-- ============================================================
CREATE TABLE dbo.AllDataTypes (
  Id INT IDENTITY(1,1) PRIMARY KEY,

  -- Integer types
  ColTinyInt TINYINT NULL,
  ColSmallInt SMALLINT NULL,
  ColInt INT NULL,
  ColBigInt BIGINT NULL,

  -- Decimal/Numeric types
  ColDecimal DECIMAL(18,4) NULL,
  ColNumeric NUMERIC(12,2) NULL,
  ColMoney MONEY NULL,
  ColSmallMoney SMALLMONEY NULL,

  -- Floating point
  ColFloat FLOAT NULL,
  ColReal REAL NULL,

  -- Boolean
  ColBit BIT NULL,

  -- Fixed-length strings
  ColChar CHAR(10) NULL,
  ColNChar NCHAR(10) NULL,

  -- Variable-length strings
  ColVarchar VARCHAR(255) NULL,
  ColNVarchar NVARCHAR(255) NULL,
  ColVarcharMax VARCHAR(MAX) NULL,
  ColNVarcharMax NVARCHAR(MAX) NULL,

  -- Legacy text
  ColText TEXT NULL,
  ColNText NTEXT NULL,

  -- Date/Time types
  ColDate DATE NULL,
  ColTime TIME NULL,
  ColSmallDateTime SMALLDATETIME NULL,
  ColDateTime DATETIME NULL,
  ColDateTime2 DATETIME2 NULL,
  ColDateTimeOffset DATETIMEOFFSET NULL,

  -- Binary types
  ColBinary BINARY(16) NULL,
  ColVarbinary VARBINARY(256) NULL,
  ColVarbinaryMax VARBINARY(MAX) NULL,

  -- Special types
  ColUniqueIdentifier UNIQUEIDENTIFIER NULL DEFAULT NEWID(),
  ColXml XML NULL
);
GO

-- ============================================================
-- sales SCHEMA — orders with cross-schema FKs
-- ============================================================
CREATE TABLE sales.Customers (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  FirstName NVARCHAR(100) NOT NULL,
  LastName NVARCHAR(100) NOT NULL,
  Email NVARCHAR(200) NULL,
  Phone VARCHAR(20) NULL,
  CreatedAt DATETIME2 DEFAULT GETUTCDATE()
);
GO

CREATE TABLE sales.Orders (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  CustomerId INT NOT NULL FOREIGN KEY REFERENCES sales.Customers(Id),
  OrderDate DATETIME2 DEFAULT GETUTCDATE(),
  ShippedDate DATETIME2 NULL,
  TotalAmount DECIMAL(12,2),
  Status NVARCHAR(20) DEFAULT 'pending'
);
GO

-- Cross-schema FK: sales.OrderItems -> dbo.Products
CREATE TABLE sales.OrderItems (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  OrderId INT NOT NULL FOREIGN KEY REFERENCES sales.Orders(Id),
  ProductId INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(Id),
  Quantity INT NOT NULL,
  UnitPrice DECIMAL(10,2) NOT NULL,
  Discount DECIMAL(5,2) DEFAULT 0
);
GO

-- ============================================================
-- hr SCHEMA — self-referencing FK + multiple FKs to same table
-- ============================================================
CREATE TABLE hr.Departments (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  Name NVARCHAR(100) NOT NULL,
  Budget MONEY NULL
);
GO

CREATE TABLE hr.Employees (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  FirstName NVARCHAR(100) NOT NULL,
  LastName NVARCHAR(100) NOT NULL,
  ManagerId INT NULL FOREIGN KEY REFERENCES hr.Employees(Id),  -- self-referencing FK
  DepartmentId INT NULL FOREIGN KEY REFERENCES hr.Departments(Id),
  HireDate DATE NOT NULL,
  TerminationDate DATE NULL,
  Salary DECIMAL(12,2),
  IsActive BIT DEFAULT 1
);
GO

-- Multiple FKs to same table (hr.Employees): reviewer and reviewee
CREATE TABLE hr.PerformanceReviews (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  EmployeeId INT NOT NULL FOREIGN KEY REFERENCES hr.Employees(Id),
  ReviewerId INT NOT NULL FOREIGN KEY REFERENCES hr.Employees(Id),
  ReviewDate DATE NOT NULL,
  Rating TINYINT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
  Comments NVARCHAR(MAX) NULL
);
GO

-- ============================================================
-- inventory SCHEMA — composite keys, nullable FKs
-- ============================================================
CREATE TABLE inventory.Warehouses (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  Name NVARCHAR(100) NOT NULL,
  Location NVARCHAR(200) NOT NULL,
  Capacity INT NOT NULL
);
GO

-- Composite PK (WarehouseId + ProductId)
CREATE TABLE inventory.StockLevels (
  WarehouseId INT NOT NULL FOREIGN KEY REFERENCES inventory.Warehouses(Id),
  ProductId INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(Id),
  Quantity INT NOT NULL DEFAULT 0,
  LastRestocked DATETIME2 NULL,
  PRIMARY KEY (WarehouseId, ProductId)
);
GO

-- Nullable FK (TransferTo warehouse may be NULL for incoming shipments)
CREATE TABLE inventory.Transfers (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  FromWarehouseId INT NOT NULL FOREIGN KEY REFERENCES inventory.Warehouses(Id),
  ToWarehouseId INT NULL FOREIGN KEY REFERENCES inventory.Warehouses(Id),
  ProductId INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(Id),
  Quantity INT NOT NULL,
  TransferDate DATETIME2 DEFAULT GETUTCDATE(),
  Status NVARCHAR(20) DEFAULT 'pending'
);
GO

-- ============================================================
-- finance SCHEMA — numeric precision, money types
-- ============================================================
CREATE TABLE finance.Accounts (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  AccountNumber VARCHAR(20) NOT NULL UNIQUE,
  AccountName NVARCHAR(100) NOT NULL,
  Balance MONEY NOT NULL DEFAULT 0,
  Currency CHAR(3) NOT NULL DEFAULT 'USD',
  IsActive BIT DEFAULT 1,
  OpenedAt DATETIME2 DEFAULT GETUTCDATE()
);
GO

CREATE TABLE finance.Transactions (
  Id BIGINT IDENTITY(1,1) PRIMARY KEY,
  AccountId INT NOT NULL FOREIGN KEY REFERENCES finance.Accounts(Id),
  Amount MONEY NOT NULL,
  TransactionType VARCHAR(10) NOT NULL CHECK (TransactionType IN ('credit', 'debit')),
  Description NVARCHAR(500) NULL,
  TransactionDate DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
  ReferenceId UNIQUEIDENTIFIER DEFAULT NEWID()
);
GO

-- ============================================================
-- content SCHEMA — text-heavy, XML, GUIDs
-- ============================================================
CREATE TABLE content.Authors (
  Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  Name NVARCHAR(200) NOT NULL,
  Bio NVARCHAR(MAX) NULL,
  Website VARCHAR(500) NULL
);
GO

CREATE TABLE content.Articles (
  Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  AuthorId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES content.Authors(Id),
  Title NVARCHAR(300) NOT NULL,
  Body NVARCHAR(MAX) NOT NULL,
  Metadata XML NULL,
  PublishedAt DATETIME2 NULL,
  IsPublished BIT DEFAULT 0,
  ViewCount INT DEFAULT 0
);
GO

-- Self-referencing: article can be a reply to another article
CREATE TABLE content.Comments (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  ArticleId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES content.Articles(Id),
  ParentCommentId INT NULL FOREIGN KEY REFERENCES content.Comments(Id),
  AuthorName NVARCHAR(100) NOT NULL,
  Body NVARCHAR(MAX) NOT NULL,
  CreatedAt DATETIME2 DEFAULT GETUTCDATE()
);
GO

-- ============================================================
-- VIEWS — various complexities
-- ============================================================
CREATE VIEW dbo.ProductSummary AS
  SELECT p.Id, p.Name, p.Price, c.Name AS CategoryName
  FROM dbo.Products p
  JOIN dbo.Categories c ON p.CategoryId = c.Id;
GO

CREATE VIEW sales.OrderSummary AS
  SELECT
    o.Id AS OrderId,
    c.FirstName + ' ' + c.LastName AS CustomerName,
    o.OrderDate,
    o.TotalAmount,
    o.Status,
    COUNT(oi.Id) AS ItemCount
  FROM sales.Orders o
  JOIN sales.Customers c ON o.CustomerId = c.Id
  LEFT JOIN sales.OrderItems oi ON oi.OrderId = o.Id
  GROUP BY o.Id, c.FirstName, c.LastName, o.OrderDate, o.TotalAmount, o.Status;
GO

CREATE VIEW hr.EmployeeDirectory AS
  SELECT
    e.Id,
    e.FirstName + ' ' + e.LastName AS FullName,
    d.Name AS Department,
    m.FirstName + ' ' + m.LastName AS ManagerName,
    e.HireDate,
    e.IsActive
  FROM hr.Employees e
  LEFT JOIN hr.Departments d ON e.DepartmentId = d.Id
  LEFT JOIN hr.Employees m ON e.ManagerId = m.Id;
GO

CREATE VIEW inventory.WarehouseStock AS
  SELECT
    w.Name AS WarehouseName,
    p.Name AS ProductName,
    sl.Quantity,
    sl.LastRestocked
  FROM inventory.StockLevels sl
  JOIN inventory.Warehouses w ON sl.WarehouseId = w.Id
  JOIN dbo.Products p ON sl.ProductId = p.Id;
GO

-- ============================================================
-- STORED PROCEDURES
-- ============================================================
CREATE PROCEDURE dbo.GetProductsByCategory
  @CategoryId INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM dbo.Products WHERE CategoryId = @CategoryId;
END;
GO

CREATE PROCEDURE dbo.CreateCategory
  @Name NVARCHAR(100),
  @Description NVARCHAR(MAX) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO dbo.Categories (Name, Description) VALUES (@Name, @Description);
  SELECT SCOPE_IDENTITY() AS NewId;
END;
GO

CREATE PROCEDURE sales.GetOrdersByStatus
  @Status NVARCHAR(20)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT o.*, c.FirstName, c.LastName
  FROM sales.Orders o
  JOIN sales.Customers c ON o.CustomerId = c.Id
  WHERE o.Status = @Status;
END;
GO

CREATE PROCEDURE hr.GetEmployeesByDepartment
  @DepartmentId INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM hr.Employees WHERE DepartmentId = @DepartmentId AND IsActive = 1;
END;
GO

CREATE PROCEDURE finance.GetAccountBalance
  @AccountNumber VARCHAR(20)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT AccountNumber, AccountName, Balance, Currency
  FROM finance.Accounts
  WHERE AccountNumber = @AccountNumber;
END;
GO
