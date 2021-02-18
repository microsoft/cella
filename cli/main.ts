#!/bin/env node

import { i, setLocale, Version } from '@microsoft/twisp.core';

// try to set the locale based on the users's settings.
setLocale(Intl.DateTimeFormat().resolvedOptions().locale, `${__dirname}/i18n/`);

console.log(i`core version: ${Version}`);