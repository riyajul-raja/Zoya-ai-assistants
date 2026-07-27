const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (pkg.dependencies['groq-sdk']) {
  delete pkg.dependencies['groq-sdk'];
}
if (pkg.dependencies['@huggingface/inference']) {
  delete pkg.dependencies['@huggingface/inference'];
}

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log("Fixed package.json");
