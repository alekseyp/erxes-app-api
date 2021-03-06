/* eslint-env jest */

import faker from 'faker';
import moment from 'moment';
import { Customers, Segments, Tags } from '../db/models';
import { graphqlRequest, connect, disconnect } from '../db/connection';
import {
  customerFactory,
  tagsFactory,
  segmentFactory,
  formFactory,
  integrationFactory,
} from '../db/factories';

beforeAll(() => connect());

afterAll(() => disconnect());

const count = response => {
  return Object.keys(response).length;
};

describe('customerQueries', () => {
  const commonParamDefs = `
    $page: Int,
    $perPage: Int,
    $segment: String,
    $tag: String,
    $ids: [String],
    $searchValue: String,
    $form: String,
    $startDate: String,
    $endDate: String
  `;

  const commonParams = `
    page: $page
    perPage: $perPage
    segment: $segment
    tag: $tag
    ids: $ids
    searchValue: $searchValue,
    form: $form,
    startDate: $startDate,
    endDate: $endDate
  `;

  const qryCustomers = `
    query customers(${commonParamDefs}) {
      customers(${commonParams}) {
        _id
        integrationId
        firstName
        lastName
        email
        phone
        isUser
        createdAt
        tagIds
        remoteAddress
        internalNotes
        location
        visitorContactInfo
        customFieldsData
        messengerData
        twitterData
        facebookData
        ownerId
        position
        department
        leadStatus
        lifecycleState
        hasAuthority
        description
        doNotDisturb
        links {
          linkedIn
          twitter
          facebook
          youtube
          github
          website
        }
        companies { _id }
        conversations { _id }
        deals { _id }
        getIntegrationData
        getMessengerCustomData
        getTags { _id }
        owner { _id }
      }
    }
  `;

  const qryCustomersMain = `
    query customersMain(${commonParamDefs}) {
      customersMain(${commonParams}) {
        list {
          _id
          firstName
          lastName
          email
          phone
          tagIds
        }
        totalCount
      }
    }
  `;

  const qryCount = `
    query customerCounts(${commonParamDefs} $byFakeSegment: JSON) {
      customerCounts(${commonParams} byFakeSegment: $byFakeSegment)
    }
  `;

  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();
  const email = faker.internet.email();
  const phone = '12345678';

  afterEach(async () => {
    // Clearing test data
    await Customers.remove({});
    await Segments.remove({});
    await Tags.remove({});
  });

  test('Customers', async () => {
    await customerFactory();
    await customerFactory();
    await customerFactory();
    await customerFactory();
    await customerFactory();

    const args = { page: 1, perPage: 3 };
    const responses = await graphqlRequest(qryCustomers, 'customers', args);

    expect(responses.length).toBe(3);
  });

  test('Customers filtered by ids', async () => {
    const customer1 = await customerFactory();
    const customer2 = await customerFactory();
    const customer3 = await customerFactory();

    await customerFactory();
    await customerFactory();
    await customerFactory();

    const ids = [customer1._id, customer2._id, customer3._id];

    const responses = await graphqlRequest(qryCustomers, 'customers', { ids });

    expect(responses.length).toBe(3);
  });

  test('Customers filtered by tag', async () => {
    const tag = await tagsFactory();

    await customerFactory();
    await customerFactory();
    await customerFactory({ tagIds: tag._id });
    await customerFactory({ tagIds: tag._id });

    const tagResponse = await Tags.findOne({}, '_id');

    const responses = await graphqlRequest(qryCustomers, 'customers', { tag: tagResponse._id });

    expect(responses.length).toBe(2);
  });

  test('Customers filtered by segment', async () => {
    await customerFactory({ firstName });
    await customerFactory({});

    const args = {
      contentType: 'customer',
      conditions: {
        field: 'firstName',
        operator: 'c',
        value: firstName,
        type: 'string',
      },
    };

    const segment = await segmentFactory(args);

    const response = await graphqlRequest(qryCustomers, 'customers', { segment: segment._id });

    expect(response.length).toBe(1);
  });

  test('Customers filtered by search value', async () => {
    await customerFactory({ firstName });
    await customerFactory({ lastName });
    await customerFactory({ phone });
    await customerFactory({ email });

    // customers by firstName ==============
    let responses = await graphqlRequest(qryCustomers, 'customers', { searchValue: firstName });

    expect(responses.length).toBe(1);
    expect(responses[0].firstName).toBe(firstName);

    // customers by lastName ===========
    responses = await graphqlRequest(qryCustomers, 'customers', { searchValue: lastName });

    expect(responses.length).toBe(1);
    expect(responses[0].lastName).toBe(lastName);

    // customers by email ==========
    responses = await graphqlRequest(qryCustomers, 'customers', { searchValue: email });

    expect(responses.length).toBe(1);
    expect(responses[0].email).toBe(email);

    // customers by phone ==============
    responses = await graphqlRequest(qryCustomers, 'customers', { searchValue: phone });

    expect(responses.length).toBe(1);
    expect(responses[0].phone).toBe(phone);
  });

  test('Main customers', async () => {
    await customerFactory();
    await customerFactory();
    await customerFactory();
    await customerFactory();

    const args = { page: 1, perPage: 3 };
    const responses = await graphqlRequest(qryCustomersMain, 'customersMain', args);

    expect(responses.list.length).toBe(3);
    expect(responses.totalCount).toBe(4);
  });

  test('Count customers', async () => {
    await customerFactory();
    await customerFactory();

    // Creating test data
    await segmentFactory({ contentType: 'customer' });
    await tagsFactory({ type: 'customer' });

    let response = await graphqlRequest(qryCount, 'customerCounts');

    expect(count(response.bySegment)).toBe(1);
    expect(count(response.byTag)).toBe(1);
  });

  test('Customer count by tag', async () => {
    await customerFactory();
    await customerFactory();

    await tagsFactory({ type: 'company' });
    await tagsFactory({ type: 'customer' });

    const response = await graphqlRequest(qryCount, 'customerCounts');

    expect(count(response.byTag)).toBe(1);
  });

  test('Customer count by segment', async () => {
    await customerFactory();
    await customerFactory();

    await segmentFactory({ contentType: 'customer' });
    await segmentFactory({ contentType: 'company' });

    const response = await graphqlRequest(qryCount, 'customerCounts');

    expect(count(response.bySegment)).toBe(1);
  });

  test('Customer count by fake segment', async () => {
    await customerFactory({ lastName });

    const byFakeSegment = {
      contentType: 'customer',
      conditions: [
        {
          field: 'lastName',
          operator: 'c',
          value: lastName,
          type: 'string',
        },
      ],
    };

    const response = await graphqlRequest(qryCount, 'customerCounts', { byFakeSegment });

    expect(response.byFakeSegment).toBe(1);
  });

  test('Customer detail', async () => {
    const customer = await customerFactory();

    const qry = `
      query customerDetail($_id: String!) {
        customerDetail(_id: $_id) {
          _id
        }
      }
    `;

    const response = await graphqlRequest(qry, 'customerDetail', { _id: customer._id });

    expect(response._id).toBe(customer._id);
  });

  test('Customer filtered by submitted form', async () => {
    const customer = await customerFactory();
    let submissions = [{ customerId: customer._id, submittedAt: new Date() }];
    const form = await formFactory({ submissions });

    const testCustomer = await customerFactory();

    submissions = [
      { customerId: testCustomer._id, submittedAt: new Date() },
      { customerId: customer._id, submittedAt: new Date() },
    ];

    const testForm = await formFactory({ submissions });

    let responses = await graphqlRequest(qryCustomersMain, 'customersMain', {
      form: form._id,
    });

    expect(responses.list.length).toBe(1);

    responses = await graphqlRequest(qryCustomersMain, 'customersMain', {
      form: testForm._id,
    });

    expect(responses.list.length).toBe(2);
  });

  test('Customer filtered by submitted form with startDate and endDate', async () => {
    const customer = await customerFactory();
    const customer1 = await customerFactory();
    const customer2 = await customerFactory();

    const startDate = '2018-04-03 10:00';
    const endDate = '2018-04-03 18:00';

    // Creating 3 submissions for form
    const submissions = [
      {
        customerId: customer._id,
        submittedAt: new Date(moment(startDate).add(5, 'days')),
      },
      {
        customerId: customer1._id,
        submittedAt: new Date(moment(startDate).add(20, 'days')),
      },
      {
        customerId: customer2._id,
        submittedAt: new Date(moment(startDate).add(1, 'hours')),
      },
    ];

    const form = await formFactory({ submissions });

    let args = {
      startDate,
      endDate,
      form: form._id,
    };

    let responses = await graphqlRequest(qryCustomersMain, 'customersMain', args);

    expect(responses.list.length).toBe(1);

    args = {
      startDate,
      endDate: moment(endDate)
        .add(25, 'days')
        .format('YYYY-MM-DD HH:mm'),
      form: form._id,
    };

    responses = await graphqlRequest(qryCustomersMain, 'customersMain', args);

    expect(responses.list.length).toBe(3);
  });

  test('Customer filtered by default selector', async () => {
    const integration = await integrationFactory({});
    await Customers.createCustomer({ integrationId: integration._id });
    await customerFactory();
    await customerFactory();

    const responses = await graphqlRequest(qryCustomersMain, 'customersMain', {});

    expect(responses.list.length).toBe(2);
  });
});
