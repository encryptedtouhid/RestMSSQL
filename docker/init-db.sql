CREATE DATABASE mssqlrest_test;
GO
USE mssqlrest_test;
GO

CREATE SCHEMA sales;
GO
CREATE SCHEMA hr;
GO

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

CREATE TABLE sales.Orders (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  CustomerName NVARCHAR(200) NOT NULL,
  OrderDate DATETIME2 DEFAULT GETUTCDATE(),
  TotalAmount DECIMAL(12,2)
);
GO

CREATE TABLE sales.OrderItems (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  OrderId INT NOT NULL FOREIGN KEY REFERENCES sales.Orders(Id),
  ProductId INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(Id),
  Quantity INT NOT NULL,
  UnitPrice DECIMAL(10,2) NOT NULL
);
GO

CREATE TABLE hr.Employees (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  FirstName NVARCHAR(100) NOT NULL,
  LastName NVARCHAR(100) NOT NULL,
  ManagerId INT NULL FOREIGN KEY REFERENCES hr.Employees(Id),
  HireDate DATE NOT NULL,
  Salary DECIMAL(12,2)
);
GO

CREATE VIEW dbo.ProductSummary AS
  SELECT p.Id, p.Name, p.Price, c.Name AS CategoryName
  FROM dbo.Products p
  JOIN dbo.Categories c ON p.CategoryId = c.Id;
GO

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
