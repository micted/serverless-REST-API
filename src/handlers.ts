import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import AWS from "aws-sdk";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import * as yup from "yup";
import {v4, validate} from "uuid" 
import { abort } from "process";


const docClient = new AWS.DynamoDB.DocumentClient()
const tableName = "ProductsTable";

const headers = {
  "content-type": "application/json",
  
}

// get method or retrieve item handling using product id
const fetchProductById  = async(id:string) => {

    const output = await docClient
      .get({
        TableName: tableName,
        Key: {
          productID: id,
        },
      })
      .promise();

    if (!output.Item) {
      throw new HttpError(404, {error: "not found"})
     
    }

    return output.Item;

}

// return error
class HttpError extends Error {
  constructor (public statusCode:number, body: Record<string, unknown>) {
    super(JSON.stringify(body));
  }
}

// JavaScript schema builder for value parsing and validation
const schema = yup.object().shape({
  name: yup.string().required(),
  price: yup.number().required()
});


// throw error e with status code and message
const handleError = (e:unknown) => {

  if (e instanceof yup.ValidationError) {

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        errors: e.errors
      })
    }
  }

  if (e instanceof HttpError) {
    return {
      statusCode: e.statusCode,
      headers,
      body: e.message,
    };
  }

  if (e instanceof SyntaxError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({error: `invalid request body format : "${e.message}"`}),
    };
  }

  throw e;

}


// create product for POST method
export const createProduct = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  try {

  const reqBody = JSON.parse(event.body as string);

  // based on schema interface defination validate the request body
  await schema.validate(reqBody,{abortEarly: false});


  const product = {
    ...reqBody,
      productID: v4()
  }
  await docClient
    .put({
      TableName: tableName,
      Item: product,
    })
    .promise();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(product),
  };

} catch(e) {

  return handleError(e)
}
};

// retrieve product for GET method
export const getProduct = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  try {
  
  const id = event.pathParameters?.id as string;
  const product = await fetchProductById(id);
 
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(product),
  }

} catch(e) {
  return handleError(e)
}

};

// update product for PUT method
export const updateProduct = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
   
  try {
  const id = event.pathParameters?.id as string;
  
   await fetchProductById(id);

  const reqBody = JSON.parse(event.body as string);

  await schema.validate(reqBody);

  const product = {
    ...reqBody,
    productID: id,
  };
  await docClient
    .put({
      TableName: tableName,
      Item: product,
    })
    .promise();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(product),
  };

} catch(e) {

   return handleError(e);
}
  
};

export const deleteProduct = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  try {

   const id = event.pathParameters?.id as string;

   await fetchProductById(id);

   await docClient.delete({
    TableName: tableName,
    Key: {
      productID: id,
    }
   }).promise();

   return {
    statusCode: 204,
    body: ""
   }

  } catch(e) {

    return handleError(e);

  }


};

export const listProduct = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const output = await docClient.scan({

    TableName: tableName,

  }).promise();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(output.Items)
  }
}
