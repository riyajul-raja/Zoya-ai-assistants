const fs = require('fs');
let code = fs.readFileSync('src/services/geminiService.ts', 'utf8');

const oldStr = `  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}`;

const newStr = `  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
  } catch (error) {
    return null;
  }
}`;

fs.writeFileSync('src/services/geminiService.ts', code.replace(oldStr, newStr));
