const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const target1 = `                    } catch (e) {\r
                        Swal.fire('Error', 'Failed to import. Check console.', 'error');\r
                        console.error(e);\r
                    }\r
                }\r
            });\r
        };\r
        window.addManualUser = async () => {`;
const replace1 = `                    } catch (e) {\r
                        Swal.fire('Error', 'Failed to import. Check console.', 'error');\r
                        console.error(e);\r
                    }\r
                } catch(err) {\r
                    console.error(err);\r
                }\r
            };\r
        };\r
        window.addManualUser = async () => {`;

const target2 = `                    } catch (e) {
                        Swal.fire('Error', 'Failed to import. Check console.', 'error');
                        console.error(e);
                    }
                }
            });
        };
        window.addManualUser = async () => {`;
const replace2 = `                    } catch (e) {
                        Swal.fire('Error', 'Failed to import. Check console.', 'error');
                        console.error(e);
                    }
                } catch(err) {
                    console.error(err);
                }
            };
        };
        window.addManualUser = async () => {`;

if (html.includes(target1)) {
    console.log("Matched target1 (CRLF)");
    html = html.replace(target1, replace1);
} else if (html.includes(target2)) {
    console.log("Matched target2 (LF)");
    html = html.replace(target2, replace2);
} else {
    console.log("No exact match found, using fallback regex...");
    html = html.replace(/(\} catch \(e\) \{\s*Swal\.fire\('Error', 'Failed to import\. Check console\.', 'error'\);\s*console\.error\(e\);\s*\})\s*\}\s*\}\);\s*\};\s*window\.addManualUser = async \(\) => \{/,
        "$1\n                } catch(err) {\n                    console.error(err);\n                }\n            };\n        };\n        window.addManualUser = async () => {"
    );
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('Fixed try catch');
