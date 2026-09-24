import {expect,test} from '@playwright/test';

test('homepage and promoted expedition pages render without an error boundary',async({page})=>{
 for(const path of ['/','/photo-expeditions','/photo-expeditions/kanha-wildlife-photography-expedition','/photo-expeditions/panna-photography-expedition']){
  const response=await page.goto(path);expect(response?.ok()).toBeTruthy();
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.getByText('This page couldn’t load.',{exact:true})).toHaveCount(0);
 }
});

test('planner restores preferences and step without saving personal contact fields',async({page})=>{
 await page.goto('/plan');
 await page.getByRole('button',{name:'India',exact:true}).click();
 await page.getByRole('button',{name:'Not sure yet — help me choose'}).click();
 await expect(page.getByLabel('Travellers',{exact:true})).toHaveValue('To discuss');
 await expect(page.getByLabel('Duration',{exact:true})).toHaveValue('To discuss');
 await page.getByRole('button',{name:'Dates not decided — continue'}).click();
 await page.getByLabel('Name',{exact:true}).fill('Draft test');
 await page.reload();
 await expect(page.getByRole('heading',{name:'Your details',exact:true})).toBeVisible();
 await expect(page.getByLabel('Name',{exact:true})).toHaveValue('');
 await expect(page.getByText('Dates to discuss · Duration to discuss · Group size to discuss')).toBeVisible();
});
