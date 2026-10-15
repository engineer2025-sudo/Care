import XCTest
@testable import CareActivityKit
final class AppLanguageTests: XCTestCase {
    func testLanguageResolutionAndFallback() {
        for (tags, expected) in [(["es-MX"],"es"),(["zh-TW"],"zh-Hans"),(["tl-PH"],"fil"),(["fil_PH"],"fil"),(["vi-VN"],"vi"),(["fr","es-US"],"es"),(["fr"],"en"),([],"en")] {
            XCTAssertEqual(AppLanguage.resolve(tags),expected)
        }
    }
    func testBundledTranslationsAndEnglishFallback() {
        for (language, expected) in [("es","Guardar"),("zh-Hans","保存"),("fil","I-save"),("vi","Lưu"),("en","Save"),("fr","Save")] {
            XCTAssertEqual(AppLanguage.text("Save",language:language),expected)
        }
        XCTAssertEqual(AppLanguage.text("Unknown diagnostic",language:"es"),"Unknown diagnostic")
    }
    func testPersonalPlaceholderValuesAreNotTranslatedOrReinterpreted() {
        XCTAssertEqual(AppLanguage.format("Hello, {0}.",["Save {1} 安"],language:"es"),"Hola, Save {1} 安.")
        XCTAssertEqual(AppLanguage.format("Step {0} of {1}",["{1}","two"],language:"es"),"Paso {1} de two")
        XCTAssertEqual(AppLanguage.format("Hello, {0}.",[],language:"es"),"Hola, {0}.")
    }
    func testSpeechDoesNotFallBackToAnotherLanguage() {
        XCTAssertTrue(AppLanguage.voiceMatches("tl-PH",language:"fil"))
        XCTAssertTrue(AppLanguage.voiceMatches("zh-CN",language:"zh-Hans"))
        XCTAssertFalse(AppLanguage.voiceMatches("zh-HK",language:"zh-Hans"))
        XCTAssertFalse(AppLanguage.voiceMatches("en-US",language:"vi"))
    }
}
