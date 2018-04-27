/* eslint-env jest */
/* eslint-disable no-underscore-dangle */

import { EmailTemplates } from '../db/models';
import { graphqlRequest, connect, disconnect } from '../db/connection';
import { emailTemplateFactory } from '../db/factories';

beforeAll(() => connect());

afterAll(() => disconnect());

describe('emailTemplateQueries', () => {
  afterEach(async () => {
    // Clearing test data
    await EmailTemplates.remove({});
  });

  test('Email templates', async () => {
    // Creating test data
    await emailTemplateFactory();
    await emailTemplateFactory();
    await emailTemplateFactory();

    const args = {
      page: 1,
      perPage: 2,
    };

    const qry = `
      query emailTemplates($page: Int $perPage: Int) {
        emailTemplates(page: $page perPage: $perPage) {
          _id
        }
      }
    `;

    const response = await graphqlRequest(qry, 'emailTemplates', args);

    expect(response.length).toBe(2);
  });

  test('Get email template total count', async () => {
    const qry = `
      query emailTemplatesTotalCount {
        emailTemplatesTotalCount
      }
    `;

    // Creating test data
    await emailTemplateFactory();
    await emailTemplateFactory();
    await emailTemplateFactory();

    const response = await graphqlRequest(qry, 'emailTemplatesTotalCount');

    expect(response).toBe(3);
  });
});
